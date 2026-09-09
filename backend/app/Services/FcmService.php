<?php

namespace App\Services;

use App\Models\FcmToken;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Firebase Cloud Messaging (HTTP v1) delivery.
 *
 * Minimal implementation that works on shared hosting — no extra Composer
 * packages required. It mints an OAuth2 access token from the Firebase
 * service-account JSON (RS256 JWT), caches it until near-expiry, then sends
 * one HTTP request per device token.
 *
 * The service account file lives OUTSIDE git at
 * storage/app/firebase/service-account.json (overridable via the
 * FIREBASE_CREDENTIALS_FILE env var). When it is missing, every method is a
 * no-op so local dev / tests never crash.
 */
class FcmService
{
    private const SEND_URL = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';

    private const TOKEN_CACHE_SECONDS = 3300; // 55 min (token valid 60 min)

    /** @var array<string, mixed>|null */
    private ?array $credentials = null;

    private bool $credentialsResolved = false;

    /**
     * Push an in-app notification row to every device of the given users.
     *
     * @param  iterable<int|string>  $userIds
     */
    public static function notifyUserIds(iterable $userIds, string $title, string $body, ?string $url = null, string $kind = 'info'): void
    {
        $userIds = collect($userIds)->map(fn ($id) => (string) $id);

        if ($userIds->isEmpty()) {
            return;
        }

        $service = new self;

        if (! $service->credentials()) {
            Log::warning('FCM: credentials not configured, skipping bulk push for '.count($userIds).' user(s)');

            return;
        }

        $tokens = FcmToken::query()
            ->whereIn('user_id', $userIds)
            ->pluck('token');

        if ($tokens->isEmpty()) {
            Log::debug('FCM: no tokens found for '.count($userIds).' user(s), skipping push');

            return;
        }

        Log::info('FCM: sending to '.count($tokens).' device(s) for '.count($userIds).' user(s)');

        try {
            $service->sendToTokens($tokens, $title, $body, $url, $kind);
        } catch (\Throwable $e) {
            Log::warning('FCM bulk push gagal: '.$e->getMessage());
        }
    }

    /**
     * Push to every device of one user (e.g. chat message, connection event).
     */
    public static function notify(User $user, string $title, string $body, ?string $url = null, string $kind = 'info'): void
    {
        try {
            $service = new self;

            if (! $service->credentials()) {
                Log::warning('FCM: credentials not configured, skipping push for user '.$user->id);

                return;
            }

            $tokens = FcmToken::query()->where('user_id', $user->id)->pluck('token');

            if ($tokens->isEmpty()) {
                Log::debug('FCM: no tokens for user '.$user->id.', skipping push');

                return;
            }

            Log::info('FCM: sending to '.count($tokens).' device(s) for user '.$user->id);
            $service->sendToTokens($tokens, $title, $body, $url, $kind);
        } catch (\Throwable $e) {
            Log::warning('FCM push gagal untuk user '.$user->id.': '.$e->getMessage());
        }
    }

    /**
     * The parsed service-account JSON, or null when not configured.
     *
     * @return array<string, mixed>|null
     */
    public function credentials(): ?array
    {
        if ($this->credentialsResolved) {
            return $this->credentials;
        }

        $this->credentialsResolved = true;

        // 1. Inline base64/JSON via FIREBASE_CREDENTIALS (hosting tanpa akses file)
        $inline = env('FIREBASE_CREDENTIALS');
        if (is_string($inline) && $inline !== '') {
            $trimmed = trim($inline);
            $decoded = base64_decode($trimmed, true);
            $jsonStr = $decoded !== false && str_starts_with(trim($decoded), '{') ? $decoded : $trimmed;
            $json = json_decode($jsonStr, true);
            if (is_array($json) && ! empty($json['client_email']) && ! empty($json['private_key'])) {
                return $this->credentials = $json;
            }
            Log::warning('FCM: FIREBASE_CREDENTIALS env tidak valid');
        }

        // 2. File path (default storage/app/firebase/service-account.json)
        $path = env('FIREBASE_CREDENTIALS_FILE', storage_path('app/firebase/service-account.json'));

        if (! is_file($path)) {
            return null;
        }

        $json = json_decode((string) file_get_contents($path), true);

        if (! is_array($json) || empty($json['client_email']) || empty($json['private_key'])) {
            Log::warning('FCM: file kredensial Firebase tidak valid di '.$path);

            return null;
        }

        return $this->credentials = $json;
    }

    /**
     * Send one FCM message per token. Best-effort: expired/invalid tokens
     * (UNREGISTERED / INVALID_ARGUMENT) are removed from the table.
     *
     * @param  Collection<int, string>  $tokens
     */
    private function sendToTokens(Collection $tokens, string $title, string $body, ?string $url, string $kind): void
    {
        $accessToken = $this->accessToken();
        $project = $this->credentials['project_id'] ?? null;

        if (! $accessToken || ! $project) {
            return;
        }

        $payload = [
            'notification' => [
                'title' => $title,
                'body' => $body,
            ],
            'data' => [
                'url' => (string) $url,
                'kind' => $kind,
                'title' => $title,
                'body' => $body,
            ],
        ];

        foreach ($tokens->unique() as $token) {
            try {
                $response = Http::withToken($accessToken)
                    ->acceptJson()
                    ->timeout(8)
                    ->post(sprintf(self::SEND_URL, $project), [
                        'message' => ['token' => $token] + $payload,
                    ]);

                if ($response->successful()) {
                    Log::debug('FCM: delivered to '.substr($token, 0, 12).'…');

                    continue;
                }

                // INVALID_ARGUMENT with UNREGISTERED (or a token that no
                // longer maps to a device) → drop the row so we stop paying
                // for dead tokens.
                $status = $response->json('error.status');
                $detail = collect($response->json('error.details', []))
                    ->pluck('errorCode')
                    ->implode(',');
                $invalid = $response->status() === 404
                    || ($status === 'INVALID_ARGUMENT' && str_contains($detail, 'UNREGISTERED'))
                    || str_contains($detail, 'UNREGISTERED');

                if ($invalid) {
                    FcmToken::query()->where('token', $token)->delete();
                }
            } catch (\Throwable $e) {
                Log::warning('FCM kirim gagal (token disingkat): '.substr($token, 0, 12).'… '.$e->getMessage());
            }
        }
    }

    /**
     * OAuth2 access token for the Firebase Admin service account.
     */
    private function accessToken(): ?string
    {
        $credentials = $this->credentials();

        if (! $credentials) {
            return null;
        }

        return Cache::remember('fcm_access_token', self::TOKEN_CACHE_SECONDS, function () use ($credentials) {
            $jwt = $this->signAssertion($credentials);
            $response = Http::asForm()
                ->timeout(8)
                ->post($credentials['token_uri'], [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $jwt,
                ]);

            if (! $response->successful()) {
                throw new \RuntimeException('Gagal menukar JWT Firebase: '.$response->body());
            }

            $accessToken = $response->json('access_token');

            if (! is_string($accessToken)) {
                throw new \RuntimeException('Response token Firebase tidak mengandung access_token');
            }

            return $accessToken;
        });
    }

    /**
     * Sign a Google OAuth2 assertion (RS256) with the service-account key.
     *
     * @param  array<string, mixed>  $credentials
     */
    private function signAssertion(array $credentials): string
    {
        $now = time();
        $header = $this->base64UrlEncode((string) json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claims = $this->base64UrlEncode((string) json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => $credentials['token_uri'],
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signature = '';
        $key = openssl_pkey_get_private((string) $credentials['private_key']);

        if ($key === false) {
            throw new \RuntimeException('Private key Firebase tidak dapat dibaca');
        }

        if (! openssl_sign($header.'.'.$claims, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException('Gagal menandatangani JWT Firebase');
        }

        return $header.'.'.$claims.'.'.$this->base64UrlEncode($signature);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
