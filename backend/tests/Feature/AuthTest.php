<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
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
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
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

    public function test_forgot_password_does_not_leak_registered_emails(): void
    {
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nonexistent@example.com',
        ])->assertOk()->assertJsonPath('success', true);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'superadmin@tracerconnect.test',
        ])->assertOk()->assertJsonPath('success', true);
    }

    public function test_reset_password_with_invalid_token_returns_422(): void
    {
        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'superadmin@tracerconnect.test',
            'token' => 'invalid-token',
            'password' => 'newpassword',
            'password_confirmation' => 'newpassword',
        ])->assertStatus(422)->assertJsonPath('success', false);
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
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk()->assertJsonPath('success', true);

        // The new password works on the next login.
        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'newpassword123',
        ])->assertOk();
    }

    public function test_change_password_with_wrong_current_password_returns_422(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $token = $user->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson('/api/v1/auth/password', [
            'current_password' => 'wrong-password',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_change_password_revokes_other_sessions_but_keeps_current(): void
    {
        $user = User::where('email', 'superadmin@tracerconnect.test')->firstOrFail();
        $otherToken = $user->createToken('other-session')->plainTextToken;
        $currentToken = $user->createToken('current-session')->plainTextToken;

        $this->withToken($currentToken)->putJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ])->assertOk();

        $this->withToken($otherToken)->getJson('/api/v1/auth/me')->assertStatus(401);
        $this->withToken($currentToken)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_public_can_register_and_receives_alumni_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Baru',
            'email' => 'alumni.baru@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
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
            ]);

        $this->assertContains('alumni', $response->json('data.user.roles'));
        $this->assertNotContains('super_admin', $response->json('data.user.roles'));
        $this->assertDatabaseHas('users', ['email' => 'alumni.baru@example.com']);
    }

    public function test_register_with_duplicate_email_returns_409(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Duplikat',
            'email' => 'superadmin@tracerconnect.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(409)->assertJsonPath('success', false);
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
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(201);

        $user = User::where('email', 'alumni.link@example.com')->firstOrFail();
        $this->assertDatabaseHas('alumni', ['id' => $alumni->id, 'user_id' => $user->id]);
    }

    public function test_registered_user_can_login_with_issued_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Token',
            'email' => 'alumni.token@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(201);

        $this->withToken($response->json('data.token'))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'alumni.token@example.com');
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
            'password' => 'password123',
            'password_confirmation' => 'password123',
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
            'password' => 'password123',
            'password_confirmation' => 'password123',
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
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => '00000000-0000-0000-0000-000000000000',
        ])->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_register_with_institution_saves_birthplace_regency_and_province(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Wilayah',
            'email' => 'alumni.wilayah@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
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

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Profil',
            'email' => 'alumni.profil@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
            'birthplace' => 'Cileunyi',
            'birthplace_regency' => 'Kabupaten Bandung',
            'birthplace_province' => 'Jawa Barat',
        ])->assertStatus(201);

        $this->withToken($response->json('data.token'))
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

    public function test_register_with_graduation_year_less_than_two_years_after_entry_returns_422(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        // Graduation year earlier than entry year.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Salah',
            'email' => 'tahun.salah@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'entry_year' => 2024,
            'graduation_year' => 2023,
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Equal years are also rejected.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Sama',
            'email' => 'tahun.sama@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'entry_year' => 2024,
            'graduation_year' => 2024,
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Only one year apart is now rejected (must be at least 2).
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Satu Tahun',
            'email' => 'tahun.satu.tahun@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'entry_year' => 2024,
            'graduation_year' => 2025,
        ])->assertStatus(422)->assertJsonPath('success', false);

        // A valid sequence (≥2 years apart) still registers.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Tahun Benar',
            'email' => 'tahun.benar@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
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
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'nis' => '123456789',
            'nisn' => '987654321',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Too long (11 characters).
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Nis Panjang',
            'email' => 'nis.panjang@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'nis' => '12345678901',
            'nisn' => '09876543210',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Exactly 10 characters passes.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Nis Pas',
            'email' => 'nis.pas@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
            'nisn' => '0987654321',
        ])->assertStatus(201)->assertJsonPath('success', true);
    }

    public function test_register_rejects_phone_shorter_than_10_characters(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        // Too short (9 characters).
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Pendek',
            'email' => 'nohp.pendek@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'phone' => '081234567',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // 10+ characters passes.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Pas',
            'email' => 'nohp.pas@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'phone' => '08123456789',
        ])->assertStatus(201)->assertJsonPath('success', true);
    }
}
