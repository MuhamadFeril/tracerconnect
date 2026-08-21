<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Alumni;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait ResolvesGoogleUser
{
    /**
     * Find or create a user from a verified Google payload.
     *
     * If the account doesn't exist yet, it is auto-created with the 'alumni'
     * role and no password. The caller should tag the session as
     * ``new_google_user`` so the frontend can redirect to the biodata form.
     *
     * Returns a two-element array [User, bool $isNew] on success, or an
     * error message string when the account is deleted or disabled.
     *
     * @param  array<string, mixed>  $payload
     * @return array{0: User, 1: bool}|string
     */
    protected function resolveGoogleUser(array $payload)
    {
        $email = mb_strtolower($payload['email']);
        $googleId = (string) ($payload['sub'] ?? '');
        $googleName = (string) ($payload['name'] ?? '');

        /** @var User|null $user */
        $user = $googleId
            ? User::withTrashed()->where('google_id', $googleId)->first()
            : null;

        $isNew = false;

        if (! $user) {
            $user = User::withTrashed()
                ->whereRaw('lower(email) = ?', [$email])
                ->first();
        }

        if ($user) {
            if ($user->trashed()) {
                return 'Akun ini telah dihapus';
            }

            if (! $user->is_active) {
                return 'Akun Anda telah dinonaktifkan';
            }

            if ($googleId && ! $user->google_id) {
                $user->update(['google_id' => $googleId]);
            }
        } else {
            // Auto-create a new alumni account via Google sign-in.
            $user = DB::transaction(function () use ($email, $googleId, $googleName) {
                $user = User::create([
                    'name' => $googleName,
                    'email' => $email,
                    'google_id' => $googleId,
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]);
                // No password — the user signed up via Google.
                $user->update(['password' => null]);
                $user->assignRole('alumni');

                // Try to link an existing imported alumni record by email.
                $alumni = Alumni::query()
                    ->whereRaw('lower(email) = ?', [$email])
                    ->whereNull('user_id')
                    ->first();

                if ($alumni) {
                    $alumni->update(['user_id' => $user->id]);
                }

                return $user;
            });

            $isNew = true;
        }

        return [$user, $isNew];
    }
}
