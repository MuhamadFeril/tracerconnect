<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Alumni;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Exceptions\RoleDoesNotExist;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Str;
use Throwable;

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
                // Akun yang sudah dihapus (soft-delete lama) TIDAK boleh
                // di-restore — data harus benar-benar hilang. Purge permanen
                // row + alumni tertautnya, lalu jatuh ke bawah untuk bikin
                // akun fresh yang wajib isi biodata dulu.
                $staleId = $user->id;
                $staleEmail = $user->email;
                DB::transaction(function () use ($user) {
                    $user->purgeDirectConversations();
                    $user->tokens()->delete();
                    try {
                        $user->fcmTokens()->delete();
                    } catch (Throwable $e) {
                    }
                    try {
                        $user->syncRoles([]);
                    } catch (Throwable $e) {
                    }
                    Alumni::withTrashed()->where('user_id', $user->id)->forceDelete();
                    Alumni::withTrashed()
                        ->whereRaw('lower(email) = ?', [mb_strtolower((string) $user->email)])
                        ->forceDelete();
                    $user->forceDelete();
                });

                AuditService::log('purge_deleted', 'user', null, null, [
                    'email' => $staleEmail,
                    'purged_user_id' => $staleId,
                    'purged_by' => 'google-oauth-fresh',
                ]);

                $user = null;
            } else {
                if (! $user->is_active) {
                    return 'Akun Anda telah dinonaktifkan';
                }

                if ($googleId && ! $user->google_id) {
                    $user->update(['google_id' => $googleId]);
                }
            }
        }

        if ($user) {
            return [$user, $isNew];
        }
            // Auto-create a new alumni account via Google sign-in.
            $user = DB::transaction(function () use ($email, $googleId, $googleName) {
                $user = User::create([
                    'name' => $googleName,
                    'email' => $email,
                    'google_id' => $googleId,
                    // Don't auto-verify — the user must complete biodata
                    // registration and verify via OTP.
                    'is_active' => true,
                    // No password for Google users — use a random hash that
                    // can never match any real password input.
                    'password' => bcrypt(Str::random(32)),
                ]);
                $this->assignAlumniRole($user);

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

        return [$user, $isNew];
    }

    /**
     * Issue a short-lived, server-signed token that proves the Google identity
     * was already verified during the OAuth callback. The frontend carries this
     * through to `completeGoogleRegistration` instead of re-verifying the
     * (short-lived, network-dependent) Google ID token — which avoids flaky
     * failures when the ID token expires or Google's cert endpoint is unreachable.
     */
    protected function issueGoogleRegistrationToken(User $user): string
    {
        return encrypt(json_encode([
            'email' => $user->email,
            'exp' => now()->addMinutes(15)->timestamp,
        ]));
    }

    /**
     * Resolve the user from a server-signed Google registration token, or null
     * when the token is missing, tampered, or expired.
     */
    protected function resolveGoogleRegistrationToken(string $token): ?User
    {
        try {
            $data = json_decode(decrypt($token), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            return null;
        }

        if (empty($data['email']) || empty($data['exp']) || $data['exp'] < time()) {
            return null;
        }

        return User::query()
            ->whereRaw('lower(email) = ?', [mb_strtolower($data['email'])])
            ->whereNotNull('google_id')
            ->first();
    }

    /**
     * Whether a Google user has finished the mandatory post-sign-up steps:
     * institution biodata filled in and email verified via OTP. Until both are
     * true the account must not receive a usable API token.
     */
    protected function isGoogleRegistrationComplete(User $user): bool
    {
        return $user->email_verified_at !== null && $user->institution_id !== null;
    }

    /**
     * Assign the default 'alumni' role to a freshly created Google user.
     *
     * If the role does not exist yet (e.g. the permission seeder has not been
     * run on a fresh database), we create it on the fly instead of throwing a
     * Spatie\Permission\Exceptions\RoleDoesNotExist that would otherwise abort
     * the entire Google sign-in with a generic "callback_failed" error.
     */
    protected function assignAlumniRole(User $user): void
    {
        try {
            $user->assignRole('alumni');
        } catch (RoleDoesNotExist $e) {
            Role::findOrCreate('alumni', 'web');
            $user->assignRole('alumni');
        }
    }
}
