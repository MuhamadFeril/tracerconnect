<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdateAvatarRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\Alumni;
use App\Models\Department;
use App\Models\GraduationYear;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Throwable;

class AuthController extends Controller
{
    /**
     * Public registration. Creates a user with the 'alumni' role only
     * (never an admin role) and auto-links an existing imported alumni
     * record when the email matches.
     */
    public function register(RegisterRequest $request)
    {
        if (User::withTrashed()->where('email', $request->email)->exists()) {
            return ApiResponse::error(
                'Email sudah terdaftar',
                ['email' => ['Email sudah digunakan']],
                409
            );
        }

        try {
            $user = DB::transaction(function () use ($request) {
                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => $request->password,
                    'institution_id' => $request->institution_id,
                    'is_active' => true,
                ]);

                $user->assignRole('alumni');

                $this->linkOrCreateAlumni($request, $user->id);

                return $user;
            });
        } catch (Throwable $e) {
            Log::error('Pendaftaran gagal', ['email' => $request->email, 'error' => $e->getMessage()]);

            return ApiResponse::error('Registrasi gagal, silakan coba lagi', [], 500);
        }

        $token = $user->createToken('api-token', ['*'], now()->addDays(7));

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => 60 * 60 * 24 * 7,
            'user' => new UserResource($user->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
        ], 'Registrasi berhasil', [], 201);
    }

    /**
     * Link an existing alumni record (by email) or create a new one from the
     * multi-step registration form. Extra profile fields are only persisted
     * when an institution was chosen (alumni records are tenant-scoped).
     */
    private function linkOrCreateAlumni(RegisterRequest $request, string $userId): void
    {
        $validated = $request->validated();

        $alumni = Alumni::query()
            ->whereRaw('lower(email) = ?', [mb_strtolower($request->email)])
            ->whereNull('user_id')
            ->when($request->filled('institution_id'), fn ($query) => $query->where('institution_id', $request->institution_id))
            ->first();

        if ($alumni) {
            $alumni->update(array_merge(['user_id' => $userId], $this->alumniProfileData($validated, $alumni->institution_id)));

            return;
        }

        if (! $request->filled('institution_id')) {
            return;
        }

        Alumni::create(array_merge([
            'institution_id' => $request->institution_id,
            'user_id' => $userId,
            'name' => $request->name,
            'email' => $request->email,
        ], $this->alumniProfileData($validated, $request->institution_id)));
    }

    /**
     * Map validated register fields onto alumni columns (resolve department
     * and graduation year by name/year, tenant-scoped).
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function alumniProfileData(array $validated, string $institutionId): array
    {
        // Only persist fields the applicant actually provided, so linking an
        // existing imported record never overwrites its data with nulls.
        $data = array_filter([
            'gender' => $validated['gender'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'nis_nim' => $validated['nis'] ?? null,
            'nisn' => $validated['nisn'] ?? null,
            'entry_year' => $validated['entry_year'] ?? null,
            'birthplace' => $validated['birthplace'] ?? null,
            'birthplace_regency' => $validated['birthplace_regency'] ?? null,
            'birthplace_province' => $validated['birthplace_province'] ?? null,
            'birth_date' => $validated['birth_date'] ?? null,
            'address' => $validated['address'] ?? null,
            'socials' => $validated['socials'] ?? null,
            'skills' => $validated['skills'] ?? null,
        ], fn ($value) => $value !== null);

        if (! empty($validated['department'])) {
            $department = Department::query()
                ->where('institution_id', $institutionId)
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($validated['department'])])
                ->first();

            $data['department_id'] = $department?->id
                ?? Department::create(['institution_id' => $institutionId, 'name' => $validated['department']])->id;
        }

        if (! empty($validated['graduation_year'])) {
            $graduationYear = GraduationYear::query()
                ->where('institution_id', $institutionId)
                ->where('year', $validated['graduation_year'])
                ->first();

            $data['graduation_year_id'] = $graduationYear?->id
                ?? GraduationYear::create(['institution_id' => $institutionId, 'year' => $validated['graduation_year']])->id;
        }

        // Career status from the multi-step form.
        $status = $validated['employment_status'] ?? null;
        $data['employment_status'] = match ($status) {
            'working' => 'working',
            'unemployed' => 'unemployed',
            'entrepreneur' => 'entrepreneur',
            'continuing_study' => 'continuing_study',
            'active_student' => 'continuing_study', // nearest existing status
            default => null,
        };

        return $data;
    }

    /**
     * Login and issue a Sanctum API token.
     */
    public function login(LoginRequest $request)
    {
        /** @var User|null $user */
        $user = User::query()->where('email', $request->email)->first();

        // Validate credentials without starting a web session (API-first flow).
        if (! $user) {
            // Equalize response time with the hash check below (no user enumeration).
            Hash::check($request->password, Hash::make('timing-equalizer'));

            return ApiResponse::error('Email atau password salah', [], 401);
        }

        if (! Hash::check($request->password, $user->password)) {
            return ApiResponse::error('Email atau password salah', [], 401);
        }

        if (! $user->is_active) {
            return ApiResponse::error('Akun Anda telah dinonaktifkan', [], 403);
        }

        $token = $user->createToken('api-token', ['*'], now()->addDays(7));

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => 60 * 60 * 24 * 7,
            'user' => new UserResource($user->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
        ], 'Login berhasil');
    }

    /**
     * Revoke the current access token.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return ApiResponse::success([], 'Logout berhasil');
    }

    /**
     * Return the authenticated user.
     */
    public function me(Request $request)
    {
        return ApiResponse::success(
            new UserResource($request->user()->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
            'Data pengguna berhasil diambil'
        );
    }

    /**
     * Update the authenticated user's profile (name / email).
     */
    public function updateProfile(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());

        return ApiResponse::success(
            new UserResource($user->fresh()->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
            'Profil berhasil diperbarui'
        );
    }

    /**
     * Upload (or replace) the authenticated user's profile photo.
     */
    public function uploadAvatar(UpdateAvatarRequest $request)
    {
        $user = $request->user();

        // Store the new file first, then remove the previous avatar so a
        // failed upload never leaves the user without a profile photo.
        $path = $request->file('avatar')->store('avatars', 'public');

        if ($user->avatar_path && $user->avatar_path !== $path) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $user->update(['avatar_path' => $path]);

        return ApiResponse::success(
            new UserResource($user->fresh()->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
            'Foto profil berhasil diunggah'
        );
    }

    /**
     * Remove the authenticated user's profile photo.
     */
    public function deleteAvatar(Request $request)
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return ApiResponse::success(
            new UserResource($user->fresh()->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
            'Foto profil berhasil dihapus'
        );
    }

    /**
     * Change the authenticated user's password. Other active sessions are
     * revoked while the current one stays signed in.
     */
    public function updatePassword(UpdatePasswordRequest $request)
    {
        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return ApiResponse::error(
                'Password saat ini tidak sesuai',
                ['current_password' => ['Password saat ini tidak sesuai']],
                422
            );
        }

        $user->update(['password' => $request->password]);

        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return ApiResponse::success([], 'Password berhasil diubah');
    }

    /**
     * Send a password reset link (does not leak which emails are registered).
     */
    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $status = Password::sendResetLink($request->only('email'));

        if (in_array($status, [Password::RESET_LINK_SENT, Password::INVALID_USER], true)) {
            return ApiResponse::success([], 'Jika email terdaftar, link reset password telah dikirim');
        }

        return ApiResponse::error('Terlalu banyak permintaan reset password. Silakan coba lagi nanti.', [], 429);
    }

    /**
     * Reset the password using the token from the reset link.
     */
    public function resetPassword(ResetPasswordRequest $request)
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return ApiResponse::success([], 'Password berhasil direset. Silakan login kembali.');
        }

        return ApiResponse::error('Token reset password tidak valid atau sudah kedaluwarsa', [], 422);
    }
}
