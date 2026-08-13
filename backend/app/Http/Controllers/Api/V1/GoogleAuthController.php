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
        $redirectUri = config('services.google.redirect');

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
        $redirectUri = config('services.google.redirect');

        if (! $clientId || ! $clientSecret || ! $redirectUri) {
            return redirect()->away($frontendUrl.'/login?google_error=not_configured');
        }

        try {
            /** @var GoogleClient $client */
            $client = app(GoogleClient::class);
            $client->setClientId($clientId);
            $client->setClientSecret($clientSecret);
            $client->setRedirectUri($redirectUri);
            $token = $client->fetchAccessTokenWithAuthCode($code, $stored['verifier']);
            $payload = $client->verifyIdToken($token['id_token'] ?? null, $clientId);
        } catch (Throwable $e) {
            Log::warning('Google OAuth callback gagal', ['error' => $e->getMessage()]);

            return redirect()->away($frontendUrl.'/login?google_error=callback_failed');
        }

        if (! $payload || empty($payload['email']) || ($payload['email_verified'] ?? false) !== true) {
            return redirect()->away($frontendUrl.'/login?google_error=invalid_token');
        }

        // Nonce replay protection: the ID token must carry the nonce this flow
        // generated, proving the token was minted for this exact request.
        if (empty($payload['nonce']) || ! hash_equals((string) $stored['nonce'], (string) $payload['nonce'])) {
            return redirect()->away($frontendUrl.'/login?google_error=invalid_state');
        }

        $result = $this->resolveGoogleUser($payload);

        if (is_string($result)) {
            return redirect()->away($frontendUrl.'/login?google_error='.urlencode($result));
        }

        $token = $result->createToken('api-token', ['*'], now()->addDays(7));

        return redirect()->away($frontendUrl.'/google/callback?token='.$token->plainTextToken);
    }

    private function frontendUrl(): string
    {
        return rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
    }
}
