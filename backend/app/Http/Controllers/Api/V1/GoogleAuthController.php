<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ResolvesGoogleUser;
use App\Http\Controllers\Controller;
use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class GoogleAuthController extends Controller
{
    use ResolvesGoogleUser;

    /**
     * Start "Login with Google" by redirecting the whole browser to Google's
     * account chooser (classic OAuth Authorization Code + PKCE flow — the same
     * URL shape GitHub produces). The PKCE verifier and the OpenID nonce are
     * stored in the cache keyed by the state, so the callback can prove it
     * started this flow and exchange the code with the matching verifier.
     */
    public function redirect()
    {
        $clientId = config('services.google.client_id');
        $redirectUri = $this->googleRedirectUri();

        if (! $clientId || ! $redirectUri) {
            return redirect()->away($this->frontendUrl().'/login?google_error=not_configured');
        }

        $state = Str::random(40);
        $verifier = Str::random(64);
        $nonce = Str::random(32);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        Cache::put('google_oauth_'.$state, ['verifier' => $verifier, 'nonce' => $nonce], now()->addMinutes(10));

        $url = 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'prompt' => 'select_account',
            'access_type' => 'online',
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
            'nonce' => $nonce,
        ]);

        return redirect()->away($url);
    }

    /**
     * Google OAuth callback: validate the state, exchange the authorization
     * code for an ID token (sending the PKCE verifier), verify the nonce,
     * resolve/create the account, issue a Sanctum token, and bounce back to
     * the frontend which stores the session.
     */
    public function callback()
    {
        $frontendUrl = $this->frontendUrl();

        $code = request()->query('code');
        $state = request()->query('state');
        $stored = $state ? Cache::pull('google_oauth_'.$state) : null;

        if (! $code || ! $state || ! $stored) {
            return redirect()->away($frontendUrl.'/login?google_error=invalid_state');
        }

        $clientId = config('services.google.client_id');
        $clientSecret = config('services.google.client_secret');
        $redirectUri = $this->googleRedirectUri();

        if (! $clientId || ! $clientSecret || ! $redirectUri) {
            return redirect()->away($frontendUrl.'/login?google_error=not_configured');
        }

        try {
            /** @var GoogleClient $client */
            $client = app(GoogleClient::class);
            $client->setClientId($clientId);
            $client->setClientSecret($clientSecret);
            $client->setRedirectUri($redirectUri);
            // fetchAccessTokenWithAuthCode($code, $redirectUri, $codeVerifier)
            // Redirect URI is already set on the client; pass PKCE verifier as 3rd arg.
            $token = $client->fetchAccessTokenWithAuthCode($code, null, $stored['verifier']);
            $payload = $client->verifyIdToken($token['id_token'] ?? null, $clientId);
        } catch (Throwable $e) {
            Log::warning('Google OAuth callback gagal', ['error' => $e->getMessage()]);

            return redirect()->away($frontendUrl.'/login?google_error=callback_failed');
        }

        if (! $payload || empty($payload['email']) || ($payload['email_verified'] ?? false) !== true) {
            return redirect()->away($frontendUrl.'/login?google_error=invalid_token');
        }

        $email = mb_strtolower((string) $payload['email']);

        // Nonce replay protection: the ID token must carry the nonce this flow
        // generated, proving the token was minted for this exact request.
        if (empty($payload['nonce']) || ! hash_equals((string) $stored['nonce'], (string) $payload['nonce'])) {
            return redirect()->away($frontendUrl.'/login?google_error=invalid_state');
        }

        $result = $this->resolveGoogleUser($payload);

        if (is_string($result)) {
            return redirect()->away($frontendUrl.'/login?google_error='.urlencode($result));
        }

        [$user, $isNew] = $result;

        $permissions = $user->getAllPermissions()->pluck('name')->all();
        $token = $user->createToken('api-token', $permissions, now()->addDays(7));

        // Store token + metadata in a short-lived cache keyed by a random code
        // so the plaintext token never appears in the URL.
        $authCode = Str::random(32);
        Cache::put('google_auth_code_'.$authCode, [
            'token' => $token->plainTextToken,
            'new_user' => $isNew,
        ], now()->addMinutes(5));

        $redirectUrl = $frontendUrl.'/google/callback?auth_code='.$authCode;

        return redirect()->away($redirectUrl);
    }

    /**
     * Exchange a short-lived authorization code (from the Google OAuth callback
     * redirect) for the actual Sanctum token. The code is single-use and
     * expires after 5 minutes.
     */
    public function exchange(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'auth_code' => ['required', 'string', 'size:32'],
        ]);

        $key = 'google_auth_code_'.$request->auth_code;
        $cached = Cache::pull($key);

        if (! $cached) {
            return response()->json([
                'success' => false,
                'message' => 'Kode otorisasi tidak valid atau sudah kedaluwarsa',
            ], 422);
        }

        $isNewUser = is_array($cached) && ($cached['new_user'] ?? false);
        $token = is_array($cached) ? $cached['token'] : $cached;

        return response()->json([
            'success' => true,
            'message' => 'Autentikasi berhasil',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'new_google_user' => $isNewUser,
            ],
        ]);
    }

    private function frontendUrl(): string
    {
        return rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
    }

    /**
     * Build the absolute redirect URI for Google OAuth.
     *
     * Google requires the redirect_uri to be an absolute URL that exactly
     * matches one registered in Google Cloud Console → Credentials →
     * Authorized redirect URIs.
     *
     * Priority:
     * 1. GOOGLE_REDIRECT_URI env (full absolute URL — must match Google Cloud Console)
     * 2. APP_URL + /api/v1/auth/google/callback
     * 3. Request host + /api/v1/auth/google/callback (fallback)
     */
    private function googleRedirectUri(): string
    {
        // 1. Explicit env value (must be a full URL like http://localhost:8000/api/v1/auth/google/callback)
        $uri = (string) env('GOOGLE_REDIRECT_URI', '');
        if (str_starts_with($uri, 'http://') || str_starts_with($uri, 'https://')) {
            return $uri;
        }

        // 2. From APP_URL config
        $appUrl = (string) config('app.url', '');
        if (str_starts_with($appUrl, 'http://') || str_starts_with($appUrl, 'https://')) {
            return rtrim($appUrl, '/').'/api/v1/auth/google/callback';
        }

        // 3. Build from actual request (last resort)
        $request = request();
        $scheme = $request->getScheme();
        $host = $request->getHost();
        $port = $request->getPort();

        $base = $scheme.'://'.$host;
        if (($scheme === 'http' && $port != 80) || ($scheme === 'https' && $port != 443)) {
            $base .= ':'.$port;
        }

        return $base.'/api/v1/auth/google/callback';
    }
}
