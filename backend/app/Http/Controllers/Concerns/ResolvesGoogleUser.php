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
                // Restore soft-deleted user so they can re-activate their
                // account via the normal Google login flow. Google already
                // verified the email, so we mark it as verified immediately.
                $user->restore();
                $user->update([
                    'google_id' => $googleId,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]);
                $user->syncRoles(['alumni']);

                AuditService::log('restore', 'user', $user->id, null, [
                    'email' => $user->email,
                    'name' => $user->name,
                    'restored_by' => 'google-oauth',
                ], null, $user->id, $user->institution_id);

                $isNew = false;

                return [$user, $isNew];
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
        }

        return [$user, $isNew];
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
