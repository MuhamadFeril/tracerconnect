<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Alumni;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

trait ResolvesGoogleUser
{
    /**
     * Find an existing user by the Google subject id, then by email, or create
     * a new alumni account (linking any imported alumni record by email). The
     * user's google_id is persisted so later sign-ins match the Google account
     * rather than relying on a spoofable email. Returns the user on success,
     * or an error message string when the account is deleted or disabled.
     *
     * @param  array<string, mixed>  $payload
     * @return User|string
     */
    protected function resolveGoogleUser(array $payload)
    {
        $email = mb_strtolower($payload['email']);
        $googleId = (string) ($payload['sub'] ?? '');

        // Prefer matching by the stable Google subject id so a spoofed email
        // can never take over someone else's account.
        /** @var User|null $user */
        $user = $googleId
            ? User::withTrashed()->where('google_id', $googleId)->first()
            : null;

        // Fall back to the email for accounts created before Google sign-in
        // stored google_id (or for existing email/password accounts).
        if (! $user) {
            $user = User::withTrashed()
                ->whereRaw('lower(email) = ?', [$email])
                ->first();
        }

        if ($user?->trashed()) {
            return 'Akun ini telah dihapus';
        }

        if ($user && ! $user->is_active) {
            return 'Akun Anda telah dinonaktifkan';
        }

        // An account created through the normal email/password flow signed in
        // with Google for the first time — link the Google identity to it so
        // future sign-ins keep using the same account.
        if ($user && $googleId && ! $user->google_id) {
            $user->update(['google_id' => $googleId]);
        }

        if (! $user) {
            try {
                $user = DB::transaction(function () use ($payload, $email, $googleId) {
                    $user = User::create([
                        'name' => $payload['name'] ?? ucfirst(explode('@', $email)[0]),
                        'email' => $email,
                        'password' => Str::password(32),
                        'google_id' => $googleId ?: null,
                        'is_active' => true,
                    ]);

                    $user->assignRole('alumni');

                    // Link an existing imported alumni record by email.
                    Alumni::query()
                        ->whereRaw('lower(email) = ?', [$email])
                        ->whereNull('user_id')
                        ->update(['user_id' => $user->id]);

                    return $user;
                });
            } catch (Throwable $e) {
                Log::error('Registrasi via Google gagal', ['email' => $email, 'error' => $e->getMessage()]);

                return 'Login Google gagal, silakan coba lagi';
            }
        }

        return $user;
    }
}
