<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ResolvesGoogleUser;
use App\Http\Controllers\Controller;
use Firebase\JWT\JWT;
use Google\Client as GoogleClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
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

        Log::info('Google OAuth redirect', [
            'redirect_uri' => $redirectUri,
            'client_id' => $clientId ? substr($clientId, 0, 10).'...' : null,
        ]);

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

        // Wrap the entire flow in a top-level try/catch so that ANY
        // unhandled exception (DB error, missing config, etc.) results in
        // a redirect back to the frontend — never a raw JSON error page.
        try {
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

            // Step 1: Exchange auth code for tokens with Google
            Log::info('Google OAuth callback starting', [
                'redirect_uri' => $redirectUri,
                'has_code' => ! empty($code),
                'has_verifier' => ! empty($stored['verifier']),
            ]);

            $tokenResponse = Http::timeout(15)->asForm()->post('https://oauth2.googleapis.com/token', [
                'code' => $code,
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
                'code_verifier' => $stored['verifier'],
            ]);

            $token = $tokenResponse->json();

            Log::info('Google token response received', [
                'status' => $tokenResponse->status(),
                'has_id_token' => isset($token['id_token']),
                'has_access_token' => isset($token['access_token']),
                'error' => $token['error'] ?? null,
                'error_description' => $token['error_description'] ?? null,
                'token_keys' => array_keys($token ?? []),
            ]);

            if (isset($token['error'])) {
                Log::warning('Google token endpoint error', ['response' => $token]);
                return redirect()->away($frontendUrl.'/login?google_error=callback_failed');
            }

            $idToken = $token['id_token'] ?? null;
            if (! $idToken) {
                Log::warning('Google token response missing id_token', [
                    'response_keys' => array_keys($token ?? []),
                    'access_token_present' => isset($token['access_token']),
                ]);
                return redirect()->away($frontendUrl.'/login?google_error=callback_failed');
            }

            // Step 2: Verify the ID token
            // Allow generous clock drift (60s) between server and Google. Shared
            // hosting / container clocks are often off by more than a few seconds,
            // and a too-small leeway made valid Google tokens fail verification
            // with "Token Google tidak valid atau kedaluwarsa".
            JWT::$leeway = 60;

            /** @var GoogleClient $client */
            $client = app(GoogleClient::class);
            $client->setClientId($clientId);
            $payload = $client->verifyIdToken($idToken, $clientId);

            Log::info('Google ID token verified', [
                'email' => $payload['email'] ?? null,
                'email_verified' => $payload['email_verified'] ?? false,
            ]);

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

            // Auto-verify email for Google users — Google already verified it.
            if ($isNew && $user->email_verified_at === null) {
                $user->update(['email_verified_at' => $user->created_at ?? now()]);
            }

            $user->tokens()->delete();

            $permissions = $user->getAllPermissions()->pluck('name')->all();
            $expiration = now()->addMinutes(config('sanctum.expiration', 1440));
            $token = $user->createToken('api-token', $permissions, $expiration);

            // The token is carried inside the authorization code itself, so the
            // code→token exchange needs no server-side cache/state. This keeps
            // the flow working even when the callback and the exchange hit
            // different processes or cache backends (which previously caused a
            // "Sesi Google tidak valid" error because the cached token was
            // missing on the second request). The code is encrypted, short-lived
            // (5 min) and self-expiring, and the plaintext token never sits in
            // the URL after the exchange.
            $profileComplete = $user->institution_id !== null;

            $authCode = encrypt(json_encode([
                'token' => $token->plainTextToken,
                'new_user' => $isNew,
                'profile_complete' => $profileComplete,
                // Wajib untuk user yang belum lengkap: rute complete-registration
                // itu publik (tanpa middleware sanctum), jadi satu-satunya
                // autentikasi yang diterima adalah registration_token ini.
                'registration_token' => ! $profileComplete ? $this->issueGoogleRegistrationToken($user) : null,
                'exp' => now()->addMinutes(5)->timestamp,
            ]));

            $redirectUrl = $frontendUrl.'/google/callback?auth_code='.rawurlencode($authCode);

            return redirect()->away($redirectUrl);
        } catch (Throwable $e) {
            Log::error('Google OAuth callback unhandled error', [
                'error' => $e->getMessage(),
                'class' => get_class($e),
                'file' => $e->getFile().':'.$e->getLine(),
            ]);

            return redirect()->away($frontendUrl.'/login?google_error=callback_failed');
        }
    }

    /**
     * Exchange a short-lived authorization code (from the Google OAuth callback
     * redirect) for the actual Sanctum token. The code is single-use and
     * expires after 5 minutes.
     */
    public function exchange(\Illuminate\Http\Request $request)
    {
        $request->validate([
            'auth_code' => ['required', 'string'],
        ]);

        // The authorization code is a self-contained, encrypted payload (no
        // server-side cache lookup). This makes the exchange safe to call more
        // than once (e.g. React StrictMode) and resilient to any cache backend.
        try {
            $data = json_decode(decrypt($request->auth_code), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Kode otorisasi tidak valid atau sudah kedaluwarsa',
            ], 422);
        }

        if (empty($data['exp']) || $data['exp'] < time()) {
            return response()->json([
                'success' => false,
                'message' => 'Kode otorisasi tidak valid atau sudah kedaluwarsa',
            ], 422);
        }

        $isNewUser = (bool) ($data['new_user'] ?? false);
        $token = $data['token'] ?? null;
        $profileComplete = $data['profile_complete'] ?? ($token !== null);

        return response()->json([
            'success' => true,
            'message' => 'Autentikasi berhasil',
            'data' => [
                'token' => $token,
                'token_type' => 'Bearer',
                'new_google_user' => $isNewUser,
                'profile_complete' => $profileComplete,
                'email' => $data['email'] ?? null,
                'name' => $data['name'] ?? null,
                'registration_token' => $data['registration_token'] ?? null,
            ],
        ]);
    }

    private function frontendUrl(): string
    {
        // 1. Config (testable).
        $configUrl = (string) config('app.frontend_url', '');
        if (str_starts_with($configUrl, 'http://') || str_starts_with($configUrl, 'https://')) {
            return rtrim($configUrl, '/');
        }

        // 2. FRONTEND_URL env var.
        $env = (string) env('FRONTEND_URL', '');
        if (str_starts_with($env, 'http://') || str_starts_with($env, 'https://')) {
            return rtrim($env, '/');
        }

        // 3. If APP_URL is set, use it (frontend served from same origin).
        $appUrl = (string) config('app.url', '');
        if (str_starts_with($appUrl, 'http://') || str_starts_with($appUrl, 'https://')) {
            return rtrim($appUrl, '/');
        }

        // 4. Last resort: assume frontend runs on localhost:5173.
        return 'http://localhost:5173';
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
     * 2. Build from actual request host (auto-detect scheme + host)
     * 3. APP_URL + /api/v1/auth/google/callback
     */
    private function googleRedirectUri(): string
    {
        // 1. Explicit env value via config (cache-safe).
        //    In services.php: 'redirect' => env('GOOGLE_REDIRECT_URI', '...')
        $uri = (string) config('services.google.redirect', '');
        if (str_starts_with($uri, 'http://') || str_starts_with($uri, 'https://')) {
            return $uri;
        }

        // 2. Build from APP_URL + path.
        $appUrl = (string) config('app.url', '');
        if (str_starts_with($appUrl, 'http://') || str_starts_with($appUrl, 'https://')) {
            return rtrim($appUrl, '/').'/api/v1/auth/google/callback';
        }

        // 3. Build from actual request (auto-detect scheme + host).
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
