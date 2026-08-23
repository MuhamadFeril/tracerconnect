<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\ResolvesGoogleUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordWithOtpRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResendOtpRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Requests\Auth\UpdateAvatarRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\Alumni;
use App\Models\Department;
use App\Models\GraduationYear;
use App\Models\User;
use App\Notifications\SendOtp;
use App\Services\AuditService;
use App\Services\OtpService;
use App\Support\ApiResponse;
use Firebase\JWT\JWT;
use Google\Client as GoogleClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class AuthController extends Controller
{
    use ResolvesGoogleUser;

    /**
     * Public registration. Creates a user with the 'alumni' role only
     * (never an admin role) and auto-links an existing imported alumni
     * record when the email matches.
     */
    public function register(RegisterRequest $request)
    {
        if (User::withTrashed()->where('email', $request->email)->exists()) {
            // Return generic success to prevent email enumeration.
            return ApiResponse::success([
                'requires_verification' => true,
                'email' => $request->email,
            ], 'Registrasi berhasil. Silakan verifikasi kode OTP yang dikirim ke email Anda.', [], 201);
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
        } catch (ValidationException $e) {
            // A field-level conflict (e.g. NIS already claimed by another
            // account) must reach the client as a 422, not a generic 500.
            throw $e;
        } catch (Throwable $e) {
            Log::error('Pendaftaran gagal', ['email' => $request->email, 'error' => $e->getMessage()]);

            return ApiResponse::error('Registrasi gagal, silakan coba lagi', [], 500);
        }

        // The account is created but NOT activated yet: an OTP is sent to the
        // email and the user must verify it before the account can log in.
        $code = OtpService::generate($user->email, 'register');
        $user->notify(new SendOtp($code, 'register'));

        return ApiResponse::success([
            'requires_verification' => true,
            'email' => $user->email,
        ], 'Registrasi berhasil. Silakan verifikasi kode OTP yang dikirim ke email Anda.', [], 201);
    }

    /**
     * Verify the registration OTP and activate the account. On success the
     * account can log in and a fresh Sanctum token is returned (the frontend
     * treats this like a login response).
     */
    public function verifyOtp(VerifyOtpRequest $request)
    {
        $email = mb_strtolower($request->email);
        $user = User::query()
            ->whereRaw('lower(email) = ?', [$email])
            ->first();

        if (! $user || ! OtpService::verify($email, 'register', $request->otp)) {
            return ApiResponse::error('Kode OTP tidak valid atau sudah kedaluwarsa', [], 422);
        }

        $user->forceFill(['email_verified_at' => now()])->save();

        $user->tokens()->delete();

        $permissions = $user->getAllPermissions()->pluck('name')->all();
        $expiration = now()->addMinutes(config('sanctum.expiration', 1440));
        $token = $user->createToken('api-token', $permissions, $expiration);

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => config('sanctum.expiration', 1440) * 60,
            'user' => new UserResource($user->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
        ], 'Akun berhasil diverifikasi');
    }

    /**
     * Resend an OTP (register verification or password reset) without leaking
     * which emails are registered.
     */
    public function resendOtp(ResendOtpRequest $request)
    {
        $email = mb_strtolower($request->email);
        $purpose = $request->input('purpose', 'register');

        $user = User::query()
            ->whereRaw('lower(email) = ?', [$email])
            ->first();

        if ($user) {
            $code = OtpService::generate($email, $purpose);
            $user->notify(new SendOtp($code, $purpose));
        }

        return ApiResponse::success(['sent' => true], 'Jika email terdaftar, kode OTP telah dikirim.');
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

        // The imported record may carry an out-of-date email. NIS is unique
        // per institution, so claim the record by (institution, NIS) instead
        // of inserting a duplicate that would violate the unique constraint.
        $nis = $validated['nis'] ?? null;

        if ($nis !== null) {
            $byNis = Alumni::query()
                ->where('institution_id', $request->institution_id)
                ->where('nis_nim', $nis)
                ->first();

            if ($byNis) {
                if ($byNis->user_id !== null) {
                    throw ValidationException::withMessages([
                        'nis' => 'NIS sudah terdaftar pada akun lain.',
                    ]);
                }

                $byNis->update(array_merge(['user_id' => $userId], $this->alumniProfileData($validated, $byNis->institution_id)));

                return;
            }
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

        // Career details follow the chosen status.
        if ($status === 'working') {
            $data['company_name'] = $validated['company_name'] ?? null;
            $data['position'] = $validated['position'] ?? null;
            $data['business_field'] = $validated['business_field'] ?? null;
            $data['business_start_year'] = $validated['business_start_year'] ?? null;
            $data['work_province'] = $validated['work_province'] ?? null;
            $data['work_city'] = $validated['work_city'] ?? null;
        }

        if ($status === 'continuing_study') {
            $data['study_institution'] = $validated['study_institution'] ?? null;
            $data['study_program'] = $validated['study_program'] ?? null;
            $data['study_entry_year'] = $validated['study_entry_year'] ?? null;
        }

        if ($status === 'entrepreneur') {
            $data['business_name'] = $validated['business_name'] ?? null;
            $data['business_field'] = $validated['business_field'] ?? null;
            $data['business_start_year'] = $validated['business_start_year'] ?? null;
            $data['business_address'] = $validated['business_address'] ?? null;
            $data['business_province'] = $validated['business_province'] ?? null;
            $data['business_city'] = $validated['business_city'] ?? null;
        }

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

        $user->tokens()->delete();

        $permissions = $user->getAllPermissions()->pluck('name')->all();
        $expiration = now()->addMinutes(config('sanctum.expiration', 1440));
        $token = $user->createToken('api-token', $permissions, $expiration);

        AuditService::log('login', 'user', $user->id, null, ['roles' => $user->getRoleNames()->all()], $request, $user->id, $user->institution_id);

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => config('sanctum.expiration', 1440) * 60,
            'user' => new UserResource($user->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
        ], 'Login berhasil');
    }

    /**
     * Login via Google (Google Identity Services).
     *
     * The client sends an ID token obtained from Google's Sign-In popup; the
     * token is verified here with google/apiclient (signature + audience). The
     * account is created on first sign-in with the 'alumni' role and linked to
     * an existing imported alumni record by email when one matches.
     */
    public function googleLogin(Request $request)
    {
        $request->validate([
            'id_token' => ['required', 'string'],
        ]);

        $clientId = config('services.google.client_id');

        if (! $clientId) {
            return ApiResponse::error('Login Google belum dikonfigurasi di server', [], 503);
        }

        try {
            // Allow up to 5 seconds of clock drift between server and Google.
            // Matches GoogleAuthController::callback() — handles shared hosting
            // environments where the server clock may be slightly ahead or behind.
            JWT::$leeway = 5;

            /** @var GoogleClient $client */
            $client = app(GoogleClient::class);
            $client->setClientId($clientId);
            $payload = $client->verifyIdToken($request->id_token, $clientId);
        } catch (Throwable $e) {
            Log::warning('Verifikasi ID token Google gagal', ['error' => $e->getMessage()]);
            $payload = null;
        }

        if (! $payload || empty($payload['email']) || ($payload['email_verified'] ?? false) !== true) {
            return ApiResponse::error('Token Google tidak valid atau kedaluwarsa', [], 401);
        }

        $result = $this->resolveGoogleUser($payload);

        if (is_string($result)) {
            return ApiResponse::error($result, [], 403);
        }

        [$user, $isNew] = $result;

        $user->tokens()->delete();

        $permissions = $user->getAllPermissions()->pluck('name')->all();
        $expiration = now()->addMinutes(config('sanctum.expiration', 1440));
        $token = $user->createToken('api-token', $permissions, $expiration);

        return ApiResponse::success([
            'token' => $token->plainTextToken,
            'token_type' => 'Bearer',
            'expires_in' => config('sanctum.expiration', 1440) * 60,
            'new_google_user' => $isNew,
            'user' => new UserResource($user->load('institution:id,name', 'roles:id,name', 'alumni.department:id,name', 'alumni.graduationYear:id,year')),
        ], 'Login berhasil');
    }

    /**
     * Revoke the current access token.
     */
    public function logout(Request $request)
    {
        $user = $request->user();

        AuditService::log('logout', 'user', $user->id, null, null, $request);

        $user->currentAccessToken()->delete();

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
     * Update the authenticated user's profile (name / email) plus any
     * alumni-editable fields (NIS, NISN, social media links, skills, biodata)
     * which are persisted onto the linked alumni record when one exists.
     * Users without an alumni record (admins, operators, etc.) get their
     * biodata persisted on the users table instead, so every account can
     * maintain a profile.
     */
    public function updateProfile(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $user->update($request->safe()->only(['name', 'email']));

        // Only fields actually present in the payload are persisted, so the
        // name/email-only update never touches biodata. Empty strings mean
        // "clear this field" and are stored as null.
        if ($user->alumni) {
            $alumniData = [];
            foreach ([
                'nis_nim' => 'nis',
                'nisn' => 'nisn',
                'socials' => 'socials',
                'skills' => 'skills',
                'gender' => 'gender',
                'phone' => 'phone',
                'birth_date' => 'birth_date',
                'birthplace' => 'birthplace',
                'birthplace_regency' => 'birthplace_regency',
                'birthplace_province' => 'birthplace_province',
                'address' => 'address',
                'employment_status' => 'employment_status',
                'company_name' => 'company_name',
                'position' => 'position',
                'business_field' => 'business_field',
                'business_start_year' => 'business_start_year',
                'work_province' => 'work_province',
                'work_city' => 'work_city',
                'study_institution' => 'study_institution',
                'study_program' => 'study_program',
                'study_entry_year' => 'study_entry_year',
                'business_name' => 'business_name',
                'business_address' => 'business_address',
                'business_province' => 'business_province',
                'business_city' => 'business_city',
            ] as $column => $input) {
                if (! $request->has($input)) {
                    continue;
                }
                $alumniData[$column] = $request->input($input) === '' ? null : $request->input($input);
            }

            if ($alumniData !== []) {
                $user->alumni()->update($alumniData);
            }
        } else {
            // Non-alumni accounts persist their biodata on the users table.
            // Alumni-only fields (NIS, NISN, socials, skills, employment
            // status) are intentionally ignored here.
            $userData = [];
            foreach (['gender', 'phone', 'birth_date', 'birthplace', 'birthplace_regency', 'birthplace_province', 'address'] as $column) {
                if (! $request->has($column)) {
                    continue;
                }
                $value = $request->input($column);
                $userData[$column] = $value === '' ? null : $value;
            }

            if ($userData !== []) {
                $user->update($userData);
            }
        }

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

        $user->forceFill(['password' => $request->password])->save();

        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return ApiResponse::success([], 'Password berhasil diubah');
    }

    /**
     * Send a change-password OTP to the authenticated user's email. Unlike
     * the public forgot-password flow, this never requires the current
     * password, so users who forgot it (or signed up via Google) can still
     * rotate their password from inside the profile.
     */
    public function sendPasswordChangeOtp(Request $request)
    {
        $user = $request->user();

        $code = OtpService::generate($user->email, 'password_change');
        $user->notify(new SendOtp($code, 'password_change'));

        return ApiResponse::success(['sent' => true], 'Kode OTP ganti password telah dikirim ke email Anda');
    }

    /**
     * Change the authenticated user's password using the OTP sent by
     * sendPasswordChangeOtp. The current session stays signed in; other
     * active sessions are revoked.
     */
    public function changePasswordWithOtp(ChangePasswordWithOtpRequest $request)
    {
        $user = $request->user();

        if (! OtpService::verify($user->email, 'password_change', $request->otp)) {
            return ApiResponse::error(
                'Kode OTP tidak valid atau sudah kedaluwarsa',
                ['otp' => ['Kode OTP tidak valid atau sudah kedaluwarsa']],
                422
            );
        }

        $user->forceFill(['password' => $request->password])->save();

        $user->tokens()->where('id', '!=', $user->currentAccessToken()->id)->delete();

        return ApiResponse::success([], 'Password berhasil diubah');
    }

    /**
     * Send a password reset OTP (does not leak which emails are registered).
     */
    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $email = mb_strtolower($request->email);
        $user = User::query()
            ->whereRaw('lower(email) = ?', [$email])
            ->first();

        if ($user && $user->is_active) {
            $code = OtpService::generate($email, 'reset');
            $user->notify(new SendOtp($code, 'reset'));
        }

        return ApiResponse::success(['sent' => true], 'Jika email terdaftar, kode OTP reset password telah dikirim');
    }

    /**
     * Reset the password using the OTP sent by forgotPassword.
     */
    public function resetPassword(ResetPasswordRequest $request)
    {
        $email = mb_strtolower($request->email);
        $user = User::query()
            ->whereRaw('lower(email) = ?', [$email])
            ->first();

        if (! $user || ! OtpService::verify($email, 'reset', $request->otp)) {
            return ApiResponse::error('Kode OTP tidak valid atau sudah kedaluwarsa', [], 422);
        }

        $user->forceFill(['password' => $request->password])->save();
        $user->tokens()->delete();

        return ApiResponse::success([], 'Password berhasil direset. Silakan login kembali.');
    }
}
