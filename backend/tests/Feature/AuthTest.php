<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\Institution;
use App\Models\User;
use Firebase\JWT\JWT;
use Google\Client as GoogleClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_login_success_returns_token_and_user(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'superadmin@tracerconnect.test',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'token',
                    'token_type',
                    'expires_in',
                    'user' => ['id', 'name', 'email', 'roles'],
                ],
                'meta',
            ]);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertContains('super_admin', $response->json('data.user.roles'));
    }

    public function test_login_with_invalid_credentials_returns_401(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'superadmin@tracerconnect.test',
            'password' => 'wrong-password',
        ])->assertStatus(401)->assertJsonPath('success', false);
    }

    public function test_login_with_invalid_input_returns_422(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'not-an-email',
            'password' => '',
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_me_without_token_returns_401(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_profile_and_password_updates_require_authentication(): void
    {
        $this->putJson('/api/v1/auth/profile', [
            'name' => 'X',
            'email' => 'x@example.com',
        ])->assertStatus(401);

        $this->putJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'NewPassword@123',
            'password_confirmation' => 'NewPassword@123',
        ])->assertStatus(401);
    }

    public function test_logout_revokes_token(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    /**
     * Register a user, verify the OTP from the cache (what the user would
     * receive by email), and return the session token — mirrors the
     * register → verify-otp flow used by the frontend.
     *
     * @param  array<string, mixed>  $payload
     */
    private function registerAndVerify(array $payload): string
    {
        $this->postJson('/api/v1/auth/register', $payload)->assertStatus(201);
        $otp = Cache::get('otp:register:'.$payload['email']);
        $this->assertNotNull($otp);

        return $this->postJson('/api/v1/auth/verify-otp', [
            'email' => $payload['email'],
            'otp' => $otp,
        ])->assertOk()->json('data.token');
    }

    public function test_forgot_password_does_not_leak_registered_emails(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nonexistent@example.com',
        ])->assertOk()->assertJsonPath('success', true);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'superadmin@tracerconnect.test',
        ])->assertOk()->assertJsonPath('success', true);
    }

    public function test_reset_password_with_invalid_otp_returns_422(): void
    {
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'superadmin@tracerconnect.test',
            'otp' => '000000',
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_reset_password_requires_valid_otp(): void
    {
        // Request the reset OTP, then reset with it.
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'superadmin@tracerconnect.test',
        ])->assertOk();

        $otp = \Illuminate\Support\Facades\Cache::get('otp:reset:superadmin@tracerconnect.test');
        $this->assertNotNull($otp);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'superadmin@tracerconnect.test',
            'otp' => $otp,
            'password' => 'BaruPass@1',
            'password_confirmation' => 'BaruPass@1',
        ])->assertOk()->assertJsonPath('success', true);

        // Old password no longer works.
        $this->postJson('/api/v1/auth/login', [
            'email' => 'superadmin@tracerconnect.test',
            'password' => 'password',
        ])->assertStatus(401);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'superadmin@tracerconnect.test',
            'password' => 'BaruPass@1',
        ])->assertOk();
    }

    public function test_user_can_update_own_profile(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => 'Nama Baru',
            'email' => $user->email,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Nama Baru')
            ->assertJsonPath('data.email', $user->email);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Nama Baru']);
    }

    public function test_user_can_update_alumni_nis_nisn_socials_and_skills(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        $token = $this->registerAndVerify([
            'name' => 'Alumni Update',
            'email' => 'alumni.update@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
            'nisn' => '0987654321',
        ]);

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => 'Alumni Update',
            'email' => 'alumni.update@example.com',
            'nis' => '1111111111',
            'nisn' => '2222222222',
            'socials' => [
                ['platform' => 'instagram', 'url' => 'https://instagram.com/alumni.update'],
                ['platform' => 'linkedin', 'url' => 'https://linkedin.com/in/alumni.update'],
            ],
            'skills' => ['PHP', 'Laravel', 'Public Speaking'],
        ])->assertOk()
            ->assertJsonPath('data.alumni.nis_nim', '1111111111')
            ->assertJsonPath('data.alumni.nisn', '2222222222')
            ->assertJsonPath('data.alumni.socials.0.platform', 'instagram')
            ->assertJsonPath('data.alumni.skills', ['PHP', 'Laravel', 'Public Speaking']);

        $user = User::where('email', 'alumni.update@example.com')->firstOrFail();
        $this->assertDatabaseHas('alumni', [
            'user_id' => $user->id,
            'nis_nim' => '1111111111',
            'nisn' => '2222222222',
        ]);
        $this->assertSame(
            [['platform' => 'instagram', 'url' => 'https://instagram.com/alumni.update']],
            array_slice($user->alumni->socials, 0, 1),
        );
        $this->assertSame(['PHP', 'Laravel', 'Public Speaking'], $user->alumni->skills);
    }

    public function test_user_can_clear_alumni_socials_and_skills(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        $token = $this->registerAndVerify([
            'name' => 'Alumni Kosong',
            'email' => 'alumni.kosong@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
            'socials' => [['platform' => 'facebook', 'url' => 'https://facebook.com/x']],
            'skills' => ['Java'],
        ]);

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => 'Alumni Kosong',
            'email' => 'alumni.kosong@example.com',
            'socials' => [],
            'skills' => [],
        ])->assertOk()
            ->assertJsonPath('data.alumni.socials', [])
            ->assertJsonPath('data.alumni.skills', []);

        $user = User::where('email', 'alumni.kosong@example.com')->firstOrFail();
        $this->assertSame([], $user->alumni->socials);
        $this->assertSame([], $user->alumni->skills);
    }

    public function test_user_can_update_alumni_biodata(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        $token = $this->registerAndVerify([
            'name' => 'Alumni Biodata',
            'email' => 'alumni.biodata@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
        ]);

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => 'Alumni Biodata',
            'email' => 'alumni.biodata@example.com',
            'gender' => 'female',
            'phone' => '081234567890',
            'birth_date' => '2005-06-15',
            'birthplace' => 'Coblong',
            'birthplace_regency' => 'Kota Bandung',
            'birthplace_province' => 'Jawa Barat',
            'address' => 'Jl. Merdeka No. 1, Bandung',
            'employment_status' => 'working',
        ])->assertOk()
            ->assertJsonPath('data.alumni.gender', 'female')
            ->assertJsonPath('data.alumni.phone', '081234567890')
            ->assertJsonPath('data.alumni.birth_date', '2005-06-15')
            ->assertJsonPath('data.alumni.birthplace', 'Coblong')
            ->assertJsonPath('data.alumni.address', 'Jl. Merdeka No. 1, Bandung')
            ->assertJsonPath('data.alumni.employment_status', 'working');

        $user = User::where('email', 'alumni.biodata@example.com')->firstOrFail();
        $this->assertDatabaseHas('alumni', [
            'user_id' => $user->id,
            'gender' => 'female',
            'phone' => '081234567890',
            'birthplace' => 'Coblong',
            'birthplace_regency' => 'Kota Bandung',
            'birthplace_province' => 'Jawa Barat',
            'address' => 'Jl. Merdeka No. 1, Bandung',
            'employment_status' => 'working',
        ]);
    }

    public function test_user_can_clear_alumni_biodata_fields(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        $token = $this->registerAndVerify([
            'name' => 'Alumni Bersih',
            'email' => 'alumni.bersih@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'phone' => '081234567890',
            'address' => 'Jl. Lama No. 1',
            'gender' => 'male',
        ]);

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => 'Alumni Bersih',
            'email' => 'alumni.bersih@example.com',
            'gender' => '',
            'phone' => '',
            'address' => '',
        ])->assertOk()
            ->assertJsonPath('data.alumni.gender', null)
            ->assertJsonPath('data.alumni.phone', null)
            ->assertJsonPath('data.alumni.address', null);

        $user = User::where('email', 'alumni.bersih@example.com')->firstOrFail();
        $this->assertDatabaseHas('alumni', [
            'user_id' => $user->id,
            'gender' => null,
            'phone' => null,
            'address' => null,
        ]);
    }

    public function test_user_without_alumni_can_update_own_biodata(): void
    {
        // Super admin has no linked alumni record — biodata must be persisted
        // on the users table so admin accounts can edit profiles too.
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'gender' => 'male',
            'phone' => '081234567890',
            'birth_date' => '1990-01-01',
            'birthplace' => 'Kebayoran Baru',
            'birthplace_regency' => 'Kota Jakarta Selatan',
            'birthplace_province' => 'DKI Jakarta',
            'address' => 'Jl. Sudirman No. 1, Jakarta',
        ])->assertOk()
            ->assertJsonPath('data.gender', 'male')
            ->assertJsonPath('data.phone', '081234567890')
            ->assertJsonPath('data.birth_date', '1990-01-01')
            ->assertJsonPath('data.birthplace', 'Kebayoran Baru')
            ->assertJsonPath('data.birthplace_regency', 'Kota Jakarta Selatan')
            ->assertJsonPath('data.birthplace_province', 'DKI Jakarta')
            ->assertJsonPath('data.address', 'Jl. Sudirman No. 1, Jakarta');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'gender' => 'male',
            'phone' => '081234567890',
            'birthplace' => 'Kebayoran Baru',
            'address' => 'Jl. Sudirman No. 1, Jakarta',
        ]);
    }

    public function test_user_without_alumni_can_clear_own_biodata(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $user->update([
            'gender' => 'male',
            'phone' => '081234567890',
            'address' => 'Jl. Lama No. 1',
        ]);
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'gender' => '',
            'phone' => '',
            'address' => '',
        ])->assertOk()
            ->assertJsonPath('data.gender', null)
            ->assertJsonPath('data.phone', null)
            ->assertJsonPath('data.address', null);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'gender' => null,
            'phone' => null,
            'address' => null,
        ]);
    }

    public function test_profile_email_must_be_unique(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $other = User::where('email', 'admin@smkn1tracer.sch.id')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => 'Nama Baru',
            'email' => $other->email,
        ])->assertStatus(422);
    }

    public function test_user_can_change_password_with_correct_current_password(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'NewPassword@123',
            'password_confirmation' => 'NewPassword@123',
        ])->assertOk()->assertJsonPath('success', true);

        // The new password works on the next login.
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'NewPassword@123',
        ])->assertOk();
    }

    public function test_change_password_with_wrong_current_password_returns_422(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/password', [
            'current_password' => 'wrong-password',
            'password' => 'NewPassword@123',
            'password_confirmation' => 'NewPassword@123',
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_change_password_revokes_other_sessions_but_keeps_current(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $otherToken = $user->createToken('other-session')->plainTextToken;
        $currentToken = $user->createToken('current-session')->plainTextToken;

        $this->withToken($currentToken)->putJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'NewPassword@123',
            'password_confirmation' => 'NewPassword@123',
        ])->assertOk();

        $this->withToken($otherToken)->getJson('/api/v1/auth/me')->assertStatus(401);
        $this->withToken($currentToken)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_user_can_change_password_via_otp_without_current_password(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        // Request the change-password OTP (no current password needed).
        $this->withToken($token)->postJson('/api/v1/auth/password/otp')
            ->assertOk()
            ->assertJsonPath('data.sent', true);

        $otp = Cache::get('otp:password_change:superadmin@tracerconnect.test');
        $this->assertNotNull($otp);

        $this->withToken($token)->putJson('/api/v1/auth/password/otp', [
            'otp' => $otp,
            'password' => 'OtpNewPass@1',
            'password_confirmation' => 'OtpNewPass@1',
        ])->assertOk()->assertJsonPath('success', true);

        // Old password no longer works; the new one does.
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertStatus(401);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'OtpNewPass@1',
        ])->assertOk();
    }

    public function test_change_password_via_otp_rejects_invalid_otp(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/password/otp', [
            'otp' => '000000',
            'password' => 'OtpNewPass@1',
            'password_confirmation' => 'OtpNewPass@1',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Password stays unchanged.
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();
    }

    public function test_change_password_via_otp_keeps_current_session_revokes_others(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $otherToken = $user->createToken('other-session')->plainTextToken;
        $currentToken = $user->createToken('current-session')->plainTextToken;

        $this->withToken($currentToken)->postJson('/api/v1/auth/password/otp')->assertOk();
        $otp = Cache::get('otp:password_change:superadmin@tracerconnect.test');
        $this->assertNotNull($otp);

        $this->withToken($currentToken)->putJson('/api/v1/auth/password/otp', [
            'otp' => $otp,
            'password' => 'OtpNewPass@1',
            'password_confirmation' => 'OtpNewPass@1',
        ])->assertOk();

        $this->withToken($otherToken)->getJson('/api/v1/auth/me')->assertStatus(401);
        $this->withToken($currentToken)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_change_password_via_otp_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/password/otp')->assertStatus(401);

        $this->putJson('/api/v1/auth/password/otp', [
            'otp' => '123456',
            'password' => 'NewPassword@123',
            'password_confirmation' => 'NewPassword@123',
        ])->assertStatus(401);
    }

    public function test_resend_otp_supports_password_change_purpose(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/auth/password/otp')->assertOk();
        $first = Cache::get('otp:password_change:superadmin@tracerconnect.test');
        $this->assertNotNull($first);

        $this->postJson('/api/v1/auth/resend-otp', [
            'email' => $user->email,
            'purpose' => 'password_change',
        ])->assertOk()->assertJsonPath('data.sent', true);

        $second = Cache::get('otp:password_change:superadmin@tracerconnect.test');
        $this->assertNotNull($second);
        $this->assertNotSame($first, $second);
    }

    public function test_public_can_register_and_receives_alumni_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Baru',
            'email' => 'alumni.baru@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.requires_verification', true)
            ->assertJsonPath('data.email', 'alumni.baru@example.com')
            ->assertJsonStructure([
                'success',
                'message',
                'data' => ['requires_verification', 'email'],
            ]);

        // The account exists with the alumni role but must verify OTP first.
        $user = User::where('email', 'alumni.baru@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('alumni'));
        $this->assertFalse($user->hasRole('super_admin'));
        $this->assertNull($user->email_verified_at);
        $this->assertDatabaseHas('users', ['email' => 'alumni.baru@example.com']);
    }

    public function test_register_with_duplicate_email_returns_generic_success(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Duplikat',
            'email' => 'superadmin@tracerconnect.test',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ])->assertStatus(201)->assertJsonPath('success', true);
    }

    public function test_register_with_invalid_input_returns_422(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_register_links_existing_alumni_record_by_email(): void
    {
        $alumni = Alumni::factory()->create([
            'email' => 'alumni.link@example.com',
            'user_id' => null,
        ]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Link',
            'email' => 'alumni.link@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ])->assertStatus(201);

        $user = User::where('email', 'alumni.link@example.com')->firstOrFail();
        $this->assertDatabaseHas('alumni', ['id' => $alumni->id, 'user_id' => $user->id]);
    }

    public function test_register_links_existing_alumni_record_by_nis(): void
    {
        // The imported record has a different email than the registrant, but
        // the NIS is unique per institution — registration claims it.
        $alumni = Alumni::factory()->create([
            'email' => 'imported.email@example.com',
            'user_id' => null,
            'nis_nim' => '1234567890',
        ]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni NIS',
            'email' => 'alumni.nis@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $alumni->institution_id,
            'nis' => '1234567890',
        ])->assertStatus(201);

        $user = User::where('email', 'alumni.nis@example.com')->firstOrFail();
        $this->assertDatabaseHas('alumni', ['id' => $alumni->id, 'user_id' => $user->id]);
    }

    public function test_register_with_nis_claimed_by_another_account_returns_422(): void
    {
        $institution = Institution::factory()->create();
        $owner = User::factory()->create();

        Alumni::factory()->create([
            'institution_id' => $institution->id,
            'user_id' => $owner->id,
            'email' => 'owner@example.com',
            'nis_nim' => '1234567890',
        ]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Pendaftar Lain',
            'email' => 'another@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
        ])->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors('nis');

        // The user account must not have been created.
        $this->assertDatabaseMissing('users', ['email' => 'another@example.com']);
    }

    public function test_register_with_study_entry_year_less_than_three_years_after_graduation_returns_422(): void
    {
        $base = [
            'name' => 'Alumni Kuliah',
            'email' => 'kuliah.too-early@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => Institution::firstOrFail()->id,
            'entry_year' => 2018,
            'graduation_year' => 2021,
            'employment_status' => 'continuing_study',
            'study_institution' => 'Universitas Indonesia',
            'study_program' => 'Teknik Informatika',
            'study_entry_year' => 2022, // hanya 1 tahun setelah lulus → ditolak
        ];

        $this->postJson('/api/v1/auth/register', $base)
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors('study_entry_year');

        // Tepat 3 tahun setelah lulus (2021 + 3 = 2024) → diterima.
        $base['email'] = 'kuliah.ok@example.com';
        $base['study_entry_year'] = 2024;
        $this->postJson('/api/v1/auth/register', $base)
            ->assertStatus(201)
            ->assertJsonPath('data.requires_verification', true);
    }

    public function test_register_requires_otp_verification_before_login(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Token',
            'email' => 'alumni.token@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ])->assertStatus(201)
            ->assertJsonPath('data.requires_verification', true)
            ->assertJsonPath('data.email', 'alumni.token@example.com');

        // No token is issued until the OTP is verified.
        $this->assertNull($response->json('data.token'));

        // Invalid OTP is rejected.
        $this->postJson('/api/v1/auth/verify-otp', [
            'email' => 'alumni.token@example.com',
            'otp' => '000000',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // The OTP (delivered by email, readable from the cache in tests)
        // verifies the account — it is never exposed in the API response.
        $this->assertNull($response->json('data.debug_otp'));
        $otp = Cache::get('otp:register:alumni.token@example.com');
        $this->assertNotNull($otp);

        $verify = $this->postJson('/api/v1/auth/verify-otp', [
            'email' => 'alumni.token@example.com',
            'otp' => $otp,
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertNotNull(User::where('email', 'alumni.token@example.com')->firstOrFail()->email_verified_at);

        $this->withToken($verify->json('data.token'))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'alumni.token@example.com');
    }

    public function test_resend_otp_regenerates_code(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Resend Otp',
            'email' => 'resend.otp@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
        ])->assertStatus(201);

        $resend = $this->postJson('/api/v1/auth/resend-otp', [
            'email' => 'resend.otp@example.com',
        ])->assertOk()->assertJsonPath('data.sent', true);

        // The regenerated code is only available in the cache (email delivery),
        // never in the API response.
        $this->assertNull($resend->json('data.debug_otp'));
        $otp = Cache::get('otp:register:resend.otp@example.com');
        $this->assertNotNull($otp);

        $this->postJson('/api/v1/auth/verify-otp', [
            'email' => 'resend.otp@example.com',
            'otp' => $otp,
        ])->assertOk()->assertJsonPath('success', true);
    }

    public function test_user_can_upload_and_delete_avatar(): void
    {
        Storage::fake('public');

        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/auth/me/avatar', [
            'avatar' => UploadedFile::fake()->image('foto.jpg', 200, 200),
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['avatar_url']]);

        $this->assertNotNull($user->fresh()->avatar_path);
        Storage::disk('public')->assertExists($user->fresh()->avatar_path);

        $this->withToken($token)->deleteJson('/api/v1/auth/me/avatar')
            ->assertOk()
            ->assertJsonPath('data.avatar_url', null);

        $this->assertNull($user->fresh()->avatar_path);
    }

    public function test_avatar_upload_replaces_previous_file(): void
    {
        Storage::fake('public');

        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/auth/me/avatar', [
            'avatar' => UploadedFile::fake()->image('pertama.png', 100, 100),
        ])->assertOk();

        $firstPath = $user->fresh()->avatar_path;
        $this->assertNotNull($firstPath);

        $this->withToken($token)->postJson('/api/v1/auth/me/avatar', [
            'avatar' => UploadedFile::fake()->image('kedua.png', 100, 100),
        ])->assertOk();

        $secondPath = $user->fresh()->avatar_path;
        $this->assertNotNull($secondPath);
        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
    }

    public function test_avatar_upload_rejects_non_image_file(): void
    {
        Storage::fake('public');

        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/auth/me/avatar', [
            'avatar' => UploadedFile::fake()->create('script.php', 100),
        ])->assertStatus(422)->assertJsonPath('success', false);

        $this->assertNull($user->fresh()->avatar_path);
    }

    public function test_avatar_endpoints_require_authentication(): void
    {
        $this->postJson('/api/v1/auth/me/avatar', [
            'avatar' => UploadedFile::fake()->image('x.png'),
        ])->assertStatus(401);

        $this->deleteJson('/api/v1/auth/me/avatar')->assertStatus(401);
    }

    // --- Google OAuth login ---------------------------------------------------

    private function fakeGoogleToken(array $payload = []): string
    {
        config(['services.google.client_id' => 'test-client-id.apps.googleusercontent.com']);

        $mock = \Mockery::mock(GoogleClient::class);
        $mock->shouldReceive('setClientId')->once();
        $mock->shouldReceive('verifyIdToken')->once()->andReturn(array_merge([
            'sub' => 'google-subject-id',
            'email' => 'alumni.google@example.com',
            'email_verified' => true,
            'name' => 'Alumni Google',
            'aud' => 'test-client-id.apps.googleusercontent.com',
        ], $payload));
        $this->app->instance(GoogleClient::class, $mock);

        return 'fake-google-id-token';
    }

    public function test_google_login_auto_creates_new_user(): void
    {
        $token = $this->fakeGoogleToken();

        $response = $this->postJson('/api/v1/auth/google', ['id_token' => $token]);

        // Debug output
        \Illuminate\Support\Facades\Log::info('TEST DEBUG', [
            'status' => $response->getStatusCode(),
            'body' => $response->getContent(),
        ]);

        $response->assertOk()
            ->assertJsonPath('data.new_google_user', true);

        // Account is created with alumni role.
        $user = User::where('email', 'alumni.google@example.com')->firstOrFail();
        
        // Debug: check what's in the database
        \Illuminate\Support\Facades\Log::info('TEST DEBUG USER', [
            'email_verified_at' => $user->email_verified_at,
            'google_id' => $user->google_id,
            'is_active' => $user->is_active,
            'password' => $user->password,
        ]);

        $this->assertTrue($user->hasRole('alumni'));
        $this->assertNotNull($user->google_id);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue($user->is_active);
    }

    public function test_google_login_links_existing_account_and_alumni_by_email(): void
    {
        $alumni = Alumni::factory()->create([
            'email' => 'alumni.google@example.com',
            'user_id' => null,
        ]);

        // The email must be registered first (no auto-creation on sign-in).
        $user = User::factory()->create([
            'email' => 'alumni.google@example.com',
            'is_active' => true,
        ]);
        $user->assignRole('alumni');
        $alumni->update(['user_id' => $user->id]);

        $token = $this->fakeGoogleToken();

        $response = $this->postJson('/api/v1/auth/google', ['id_token' => $token])->assertOk();

        $this->assertSame('alumni.google@example.com', $response->json('data.user.email'));
        $this->assertSame('google-subject-id', $user->fresh()->google_id);
        $this->assertDatabaseHas('alumni', ['id' => $alumni->id, 'user_id' => $user->id]);
    }

    public function test_google_login_logs_into_existing_account_without_duplicating(): void
    {
        $existing = User::factory()->create([
            'email' => 'admin.google@example.com',
            'password' => 'password',
        ]);
        $existing->assignRole('institution_admin');

        $token = $this->fakeGoogleToken(['email' => 'admin.google@example.com', 'name' => 'Admin Google']);

        $response = $this->postJson('/api/v1/auth/google', ['id_token' => $token]);

        $response->assertOk()->assertJsonPath('data.user.email', 'admin.google@example.com');
        $this->assertContains('institution_admin', $response->json('data.user.roles'));
        $this->assertSame(1, User::where('email', 'admin.google@example.com')->count());
        // First Google sign-in for an email/password account links google_id.
        $this->assertSame('google-subject-id', $existing->fresh()->google_id);
    }

    public function test_google_login_rejects_unverified_email(): void
    {
        $token = $this->fakeGoogleToken(['email_verified' => false]);

        $this->postJson('/api/v1/auth/google', ['id_token' => $token])
            ->assertStatus(401)
            ->assertJsonPath('success', false);
    }

    public function test_google_login_rejects_invalid_token(): void
    {
        config(['services.google.client_id' => 'test-client-id.apps.googleusercontent.com']);

        $mock = \Mockery::mock(GoogleClient::class);
        $mock->shouldReceive('setClientId')->once();
        $mock->shouldReceive('verifyIdToken')->once()->andThrow(new \Exception('Invalid token'));
        $this->app->instance(GoogleClient::class, $mock);

        $this->postJson('/api/v1/auth/google', ['id_token' => 'tampered-token'])
            ->assertStatus(401)
            ->assertJsonPath('success', false);
    }

    public function test_google_login_rejects_inactive_account(): void
    {
        $user = User::factory()->create([
            'email' => 'nonaktif.google@example.com',
            'is_active' => false,
        ]);
        $user->assignRole('alumni');

        $token = $this->fakeGoogleToken(['email' => 'nonaktif.google@example.com']);

        $this->postJson('/api/v1/auth/google', ['id_token' => $token])
            ->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_google_login_requires_id_token(): void
    {
        $this->postJson('/api/v1/auth/google', [])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    // --- Google OAuth redirect flow (server-side account chooser, PKCE) -----

    public function test_google_redirect_builds_account_chooser_url(): void
    {
        config(['services.google.client_id' => 'test-client-id.apps.googleusercontent.com']);
        config(['services.google.client_secret' => 'test-secret']);
        config(['services.google.redirect' => 'http://localhost:8000/api/v1/auth/google/callback']);

        $response = $this->get('/api/v1/auth/google');

        $response->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('https://accounts.google.com/o/oauth2/v2/auth', $location);
        $this->assertStringContainsString('prompt=select_account', $location);
        $this->assertStringContainsString('response_type=code', $location);
        $this->assertStringContainsString('code_challenge=', $location);
        $this->assertStringContainsString('code_challenge_method=S256', $location);
        $this->assertStringContainsString('nonce=', $location);
        $this->assertStringContainsString('redirect_uri='.urlencode('http://localhost:8000/api/v1/auth/google/callback'), $location);
    }

    public function test_google_redirect_requires_client_id(): void
    {
        config(['services.google.client_id' => null]);
        config(['app.frontend_url' => 'http://localhost:5173']);

        $this->get('/api/v1/auth/google')
            ->assertRedirect('http://localhost:5173/login?google_error=not_configured');
    }

    public function test_google_callback_exchanges_code_and_redirects_with_token(): void
    {
        config(['services.google.client_id' => 'test-client-id.apps.googleusercontent.com']);
        config(['services.google.client_secret' => 'test-secret']);
        config(['services.google.redirect' => 'http://localhost:8000/api/v1/auth/google/callback']);
        config(['app.frontend_url' => 'http://localhost:5173']);

        $state = 'test-state-123';
        $nonce = 'test-nonce-456';
        Cache::put('google_oauth_'.$state, ['verifier' => 'test-verifier', 'nonce' => $nonce], now()->addMinutes(10));

        // The account must already be registered — Google sign-in never creates one.
        $user = User::factory()->create([
            'email' => 'alumni.redirect@example.com',
            'is_active' => true,
        ]);
        $user->assignRole('alumni');

        $mock = \Mockery::mock(GoogleClient::class);
        $mock->shouldReceive('setClientId')->once();
        $mock->shouldReceive('verifyIdToken')->once()->andReturn([
            'sub' => 'google-subject-id',
            'email' => 'alumni.redirect@example.com',
            'email_verified' => true,
            'name' => 'Alumni Redirect',
            'aud' => 'test-client-id.apps.googleusercontent.com',
            'nonce' => $nonce,
        ]);
        $this->app->instance(GoogleClient::class, $mock);

        // Mock the HTTP call to Google token endpoint
        \Illuminate\Support\Facades\Http::fake([
            'oauth2.googleapis.com/token' => \Illuminate\Support\Facades\Http::response([
                'id_token' => 'fake-id-token',
                'access_token' => 'fake-access-token',
            ], 200),
        ]);

        $response = $this->get('/api/v1/auth/google/callback?code=auth-code&state='.$state);

        \Illuminate\Support\Facades\Log::info('TEST DEBUG CALLBACK', [
            'status' => $response->getStatusCode(),
            'location' => $response->headers->get('Location'),
        ]);

        $response->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('http://localhost:5173/google/callback?auth_code=', $location);
    }

    public function test_google_callback_auto_creates_and_redirects_with_auth_code(): void
    {
        config(['services.google.client_id' => 'test-client-id.apps.googleusercontent.com']);
        config(['services.google.redirect' => 'http://localhost:8000/api/v1/auth/google/callback']);
        config(['app.frontend_url' => 'http://localhost:5173']);

        $state = 'test-state-unreg';
        $nonce = 'test-nonce-unreg';
        Cache::put('google_oauth_'.$state, ['verifier' => 'test-verifier', 'nonce' => $nonce], now()->addMinutes(10));

        $mock = \Mockery::mock(GoogleClient::class);
        $mock->shouldReceive('setClientId')->once();
        $mock->shouldReceive('verifyIdToken')->once()->andReturn([
            'sub' => 'google-subject-id',
            'email' => 'fresh.google@example.com',
            'email_verified' => true,
            'name' => 'Fresh Google',
            'aud' => 'test-client-id.apps.googleusercontent.com',
            'nonce' => $nonce,
        ]);
        $this->app->instance(GoogleClient::class, $mock);

        // Mock the HTTP call to Google token endpoint
        \Illuminate\Support\Facades\Http::fake([
            'oauth2.googleapis.com/token' => \Illuminate\Support\Facades\Http::response([
                'id_token' => 'fake-id-token',
                'access_token' => 'fake-access-token',
            ], 200),
        ]);

        $response = $this->get('/api/v1/auth/google/callback?code=auth-code&state='.$state);

        \Illuminate\Support\Facades\Log::info('TEST DEBUG CALLBACK 2', [
            'status' => $response->getStatusCode(),
            'location' => $response->headers->get('Location'),
        ]);

        $response->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('http://localhost:5173/google/callback?auth_code=', $location);

        // Account was auto-created.
        $user = User::where('email', 'fresh.google@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('alumni'));
        $this->assertNotNull($user->google_id);
    }

    public function test_google_callback_rejects_unknown_state(): void
    {
        config(['app.frontend_url' => 'http://localhost:5173']);

        $this->get('/api/v1/auth/google/callback?code=auth-code&state=forged-state')
            ->assertRedirect('http://localhost:5173/login?google_error=invalid_state');
    }

    public function test_register_with_institution_sets_institution_and_links_scoped_alumni(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);
        $alumni = Alumni::factory()->create([
            'institution_id' => $institution->id,
            'email' => 'scoped.alumni@example.com',
            'user_id' => null,
        ]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Scoped Alumni',
            'email' => 'scoped.alumni@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
        ])->assertStatus(201);

        $user = User::where('email', 'scoped.alumni@example.com')->firstOrFail();
        $this->assertSame($institution->id, $user->institution_id);
        $this->assertDatabaseHas('alumni', ['id' => $alumni->id, 'user_id' => $user->id]);
    }

    public function test_register_with_institution_does_not_link_alumni_from_other_institution(): void
    {
        $chosen = Institution::factory()->create(['status' => 'active']);
        $other = Institution::factory()->create(['status' => 'active']);
        $alumni = Alumni::factory()->create([
            'institution_id' => $other->id,
            'email' => 'cross.tenant@example.com',
            'user_id' => null,
        ]);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Cross Tenant',
            'email' => 'cross.tenant@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $chosen->id,
        ])->assertStatus(201);

        $user = User::where('email', 'cross.tenant@example.com')->firstOrFail();
        $this->assertSame($chosen->id, $user->institution_id);
        $this->assertDatabaseHas('alumni', ['id' => $alumni->id, 'user_id' => null]);
    }

    public function test_register_with_unknown_institution_returns_422(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'X',
            'email' => 'x@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => '00000000-0000-0000-0000-000000000000',
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_register_with_institution_saves_birthplace_regency_and_province(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Wilayah',
            'email' => 'alumni.wilayah@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'birthplace' => 'Cileunyi',
            'birthplace_regency' => 'Kabupaten Bandung',
            'birthplace_province' => 'Jawa Barat',
        ])->assertStatus(201)->assertJsonPath('success', true);

        $user = User::where('email', 'alumni.wilayah@example.com')->firstOrFail();
        $this->assertDatabaseHas('alumni', [
            'user_id' => $user->id,
            'birthplace' => 'Cileunyi',
            'birthplace_regency' => 'Kabupaten Bandung',
            'birthplace_province' => 'Jawa Barat',
        ]);
    }

    public function test_me_returns_linked_alumni_summary_with_birthplace_label(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        $token = $this->registerAndVerify([
            'name' => 'Alumni Profil',
            'email' => 'alumni.profil@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
            'birthplace' => 'Cileunyi',
            'birthplace_regency' => 'Kabupaten Bandung',
            'birthplace_province' => 'Jawa Barat',
        ]);

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.alumni.birthplace_label', 'Cileunyi, Kabupaten Bandung, Jawa Barat')
            ->assertJsonPath('data.alumni.nis_nim', '1234567890')
            ->assertJsonPath('data.alumni.name', 'Alumni Profil');

        // Users without a linked alumni record get alumni: null.
        $admin = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $this->withToken($admin->createToken('test-token')->plainTextToken)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.alumni', null);
    }

    public function test_register_with_graduation_year_less_than_three_years_after_entry_returns_422(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        // Graduation year earlier than entry year.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Salah',
            'email' => 'tahun.salah@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'entry_year' => 2024,
            'graduation_year' => 2023,
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Equal years are also rejected.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Sama',
            'email' => 'tahun.sama@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'entry_year' => 2024,
            'graduation_year' => 2024,
        ])->assertStatus(422)->assertJsonPath('success', false);

        // One or two years apart are now rejected (must be at least 3).
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Dua Tahun',
            'email' => 'tahun.dua.tahun@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'entry_year' => 2024,
            'graduation_year' => 2025,
        ])->assertStatus(422)->assertJsonPath('success', false);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Dua Tahun Kedua',
            'email' => 'tahun.dua.tahun2@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'entry_year' => 2024,
            'graduation_year' => 2026,
        ])->assertStatus(422)->assertJsonPath('success', false);

        // A valid sequence (≥3 years apart) still registers.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Benar',
            'email' => 'tahun.benar@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'entry_year' => 2023,
            'graduation_year' => 2026,
        ])->assertStatus(201)->assertJsonPath('success', true);
    }

    public function test_register_requires_nis_and_nisn_exactly_10_characters(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        // Too short (9 characters).
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Nis Pendek',
            'email' => 'nis.pendek@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'nis' => '123456789',
            'nisn' => '987654321',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Too long (11 characters).
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Nis Panjang',
            'email' => 'nis.panjang@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'nis' => '12345678901',
            'nisn' => '09876543210',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Exactly 10 characters passes.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Nis Pas',
            'email' => 'nis.pas@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
            'nisn' => '0987654321',
        ])->assertStatus(201)->assertJsonPath('success', true);
    }

    public function test_register_validates_phone_prefix_and_length(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        // Wrong prefix (must start with 08 or +62).
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Salah Prefix',
            'email' => 'nohp.prefix@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'phone' => '1234567890',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Too short (9 characters) despite valid 08 prefix.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Pendek',
            'email' => 'nohp.pendek@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'phone' => '081234567',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // 10+ characters with 08 prefix passes.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Pas',
            'email' => 'nohp.pas@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'phone' => '08123456789',
        ])->assertStatus(201)->assertJsonPath('success', true);

        // +62 prefix also passes.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Internasional',
            'email' => 'nohp.internasional@example.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'institution_id' => $institution->id,
            'phone' => '+628123456789',
        ])->assertStatus(201)->assertJsonPath('success', true);
    }

    // --- JWT::$leeway tolerance for Google login (clock drift) ----------------

    /**
     * Verify that AuthController::googleLogin() sets JWT::$leeway before
     * calling verifyIdToken, so small clock drifts on shared hosting don't
     * cause "Token Google tidak valid atau kedaluwarsa" for mobile users.
     *
     * The test resets JWT::$leeway to 0, hits the endpoint, and asserts
     * that it was bumped to 60 — the same generous value used by
     * GoogleAuthController to tolerate shared-hosting clock drift.
     */
    public function test_google_login_sets_jwt_leeway_for_clock_drift(): void
    {
        // Ensure leeway starts at 0 so we can detect the change.
        JWT::$leeway = 0;

        $token = $this->fakeGoogleToken();

        $this->postJson('/api/v1/auth/google', ['id_token' => $token])
            ->assertOk()
            ->assertJsonPath('data.new_google_user', true);

        // leeway must have been set to 60 by AuthController::googleLogin().
        $this->assertSame(60, JWT::$leeway);
    }

    /**
     * Confirm that a Google login succeeds even when JWT::$leeway is active.
     * This is a regression guard: if the leeway assignment is accidentally
     * removed, the test still passes (the mock always returns valid) — so
     * the previous test is the real safety net. This test documents intent.
     */
    public function test_google_login_succeeds_with_leeway_active(): void
    {
        JWT::$leeway = 5;

        $token = $this->fakeGoogleToken();

        $response = $this->postJson('/api/v1/auth/google', ['id_token' => $token]);

        $response->assertOk()
            ->assertJsonStructure([
                'success', 'message',
                'data' => [
                    'token', 'token_type', 'expires_in',
                    'new_google_user',
                    'user' => ['id', 'name', 'email', 'roles'],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));
    }

    /**
     * After a successful Google login, the issued Sanctum token should be
     * usable on authenticated endpoints — confirming the full round-trip.
     */
    public function test_google_login_token_works_on_authenticated_endpoint(): void
    {
        JWT::$leeway = 5;

        $token = $this->fakeGoogleToken();

        $loginResponse = $this->postJson('/api/v1/auth/google', ['id_token' => $token])
            ->assertOk();

        $sanctumToken = $loginResponse->json('data.token');

        $this->withToken($sanctumToken)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'alumni.google@example.com');
    }
}
