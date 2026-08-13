<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\Institution;
use App\Models\User;
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

    public function test_user_can_update_alumni_nis_nisn_socials_and_skills(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Update',
            'email' => 'alumni.update@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
            'nisn' => '0987654321',
        ])->assertStatus(201);

        $token = $response->json('data.token');

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

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Kosong',
            'email' => 'alumni.kosong@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'nis' => '1234567890',
            'socials' => [['platform' => 'facebook', 'url' => 'https://facebook.com/x']],
            'skills' => ['Java'],
        ])->assertStatus(201);

        $token = $response->json('data.token');

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

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Biodata',
            'email' => 'alumni.biodata@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
        ])->assertStatus(201);

        $token = $response->json('data.token');

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

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Alumni Bersih',
            'email' => 'alumni.bersih@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'phone' => '081234567890',
            'address' => 'Jl. Lama No. 1',
            'gender' => 'male',
        ])->assertStatus(201);

        $token = $response->json('data.token');

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
        // on the users table so admin/operator accounts can edit profiles too.
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

    public function test_google_login_creates_account_with_alumni_role_and_token(): void
    {
        $token = $this->fakeGoogleToken();

        $response = $this->postJson('/api/v1/auth/google', ['id_token' => $token]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'token_type',
                    'expires_in',
                    'user' => ['id', 'name', 'email', 'roles'],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertSame('Alumni Google', $response->json('data.user.name'));
        $this->assertSame('alumni.google@example.com', $response->json('data.user.email'));
        $this->assertContains('alumni', $response->json('data.user.roles'));
        $this->assertDatabaseHas('users', [
            'email' => 'alumni.google@example.com',
            'google_id' => 'google-subject-id',
        ]);
    }

    public function test_google_login_links_existing_alumni_record_by_email(): void
    {
        $alumni = Alumni::factory()->create([
            'email' => 'alumni.google@example.com',
            'user_id' => null,
        ]);

        $token = $this->fakeGoogleToken();

        $this->postJson('/api/v1/auth/google', ['id_token' => $token])->assertOk();

        $user = User::where('email', 'alumni.google@example.com')->firstOrFail();
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

        $mock = \Mockery::mock(GoogleClient::class);
        $mock->shouldReceive('setClientId')->once();
        $mock->shouldReceive('setClientSecret')->once();
        $mock->shouldReceive('setRedirectUri')->once();
        $mock->shouldReceive('fetchAccessTokenWithAuthCode')->once()->with('auth-code', 'test-verifier')->andReturn([
            'id_token' => 'fake-id-token',
        ]);
        $mock->shouldReceive('verifyIdToken')->once()->andReturn([
            'sub' => 'google-subject-id',
            'email' => 'alumni.redirect@example.com',
            'email_verified' => true,
            'name' => 'Alumni Redirect',
            'aud' => 'test-client-id.apps.googleusercontent.com',
            'nonce' => $nonce,
        ]);
        $this->app->instance(GoogleClient::class, $mock);

        $response = $this->get('/api/v1/auth/google/callback?code=auth-code&state='.$state);

        $response->assertRedirect();
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('http://localhost:5173/google/callback?token=', $location);
        $this->assertDatabaseHas('users', ['email' => 'alumni.redirect@example.com']);
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

    public function test_register_validates_phone_prefix_and_length(): void
    {
        $institution = Institution::factory()->create(['status' => 'active']);

        // Wrong prefix (must start with 08 or +62).
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Salah Prefix',
            'email' => 'nohp.prefix@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'phone' => '1234567890',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // Too short (9 characters) despite valid 08 prefix.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Pendek',
            'email' => 'nohp.pendek@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'phone' => '081234567',
        ])->assertStatus(422)->assertJsonPath('success', false);

        // 10+ characters with 08 prefix passes.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Pas',
            'email' => 'nohp.pas@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'phone' => '08123456789',
        ])->assertStatus(201)->assertJsonPath('success', true);

        // +62 prefix also passes.
        $this->postJson('/api/v1/auth/register', [
            'name' => 'NoHP Internasional',
            'email' => 'nohp.internasional@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'institution_id' => $institution->id,
            'phone' => '+628123456789',
        ])->assertStatus(201)->assertJsonPath('success', true);
    }
}
