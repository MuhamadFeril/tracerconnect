<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function loginAs(string $email): string
    {
        return User::where('email', $email)->firstOrFail()->createToken('test-token')->plainTextToken;
    }

    private function demoInstitution(): Institution
    {
        return Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail();
    }

    public function test_super_admin_can_create_user_with_role(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');
        $institution = $this->demoInstitution();

        $response = $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Operator Satu',
            'email' => 'operator@smkn1tracer.sch.id',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'hrd',
            'institution_id' => $institution->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.email', 'operator@smkn1tracer.sch.id')
            ->assertJsonPath('data.institution_id', $institution->id)
            ->assertJsonPath('data.roles.0', 'hrd');

        $this->assertDatabaseHas('users', ['email' => 'operator@smkn1tracer.sch.id']);
    }

    public function test_institution_admin_can_create_user_forced_into_own_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $institution = $this->demoInstitution();

        $response = $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Operator Dua',
            'email' => 'operator2@smkn1tracer.sch.id',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'hrd',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.institution_id', $institution->id);
    }

    public function test_institution_admin_cannot_assign_super_admin_role(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Hacker',
            'email' => 'hacker@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'super_admin',
        ])->assertStatus(422);
    }

    public function test_super_admin_can_create_institution_admin_on_existing_school_without_creating_one(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');
        $institution = $this->demoInstitution();

        $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Admin Sekolah',
            'email' => 'admin-sekolah@smkn1tracer.sch.id',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'institution_admin',
            'institution_id' => $institution->id,
        ])->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.roles.0', 'institution_admin')
            ->assertJsonPath('data.institution_id', $institution->id);
    }

    public function test_multi_tenant_super_admin_must_attach_tenant_scoped_user_to_existing_school(): void
    {
        // A second active school turns this into a multi-tenant deployment.
        $other = Institution::create([
            'name' => 'SMK Negeri 9 Surabaya',
            'slug' => 'smk-negeri-9-surabaya',
            'code' => 'SMK09',
            'status' => 'active',
        ]);

        $token = $this->loginAs('superadmin@tracerconnect.test');

        // Tenant-scoped accounts without an institution are rejected…
        $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'HRD Tanpa Sekolah',
            'email' => 'hrd-noschool@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'hrd',
        ])->assertStatus(422);

        // …but the super admin can still attach them to an existing school.
        $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Admin SMK Negeri 9',
            'email' => 'admin@smkn9surabaya.sch.id',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'institution_admin',
            'institution_id' => $other->id,
        ])->assertCreated()
            ->assertJsonPath('data.roles.0', 'institution_admin')
            ->assertJsonPath('data.institution_id', $other->id);
    }

    public function test_super_admin_role_cannot_have_institution(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');

        $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'SA Baru',
            'email' => 'sa-baru@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'super_admin',
            'institution_id' => $this->demoInstitution()->id,
        ])->assertStatus(201);

        // Verify the created user has no institution.
        $created = \App\Models\User::where('email', 'sa-baru@example.com')->first();
        $this->assertNull($created->institution_id, 'Super admin must not belong to an institution');
    }

    public function test_duplicate_email_returns_422(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');

        $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Duplikat',
            'email' => 'superadmin@tracerconnect.test',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'hrd',
            'institution_id' => $this->demoInstitution()->id,
        ])->assertStatus(422);
    }

    public function test_institution_admin_list_only_sees_own_institution_users(): void
    {
        $superToken = $this->loginAs('superadmin@tracerconnect.test');
        $otherInstitution = Institution::create([
            'name' => 'Universitas Lain',
            'slug' => 'universitas-lain',
            'code' => 'UL01',
            'status' => 'active',
        ]);

        $this->withToken($superToken)->postJson('/api/v1/users', [
            'name' => 'User B',
            'email' => 'userb@univ-lain.test',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'hrd',
            'institution_id' => $otherInstitution->id,
        ])->assertCreated();

        // Institution admin only sees their own institution's users.
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($adminToken)->getJson('/api/v1/users')->assertOk();

        $emails = collect($response->json('data'))->pluck('email');
        $this->assertNotContains('userb@univ-lain.test', $emails);
        $this->assertContains('admin@smkn1tracer.sch.id', $emails);
    }

    public function test_tenant_isolation_cannot_view_other_institution_user(): void
    {
        $superToken = $this->loginAs('superadmin@tracerconnect.test');
        $otherInstitution = Institution::create([
            'name' => 'Universitas Lain',
            'slug' => 'universitas-lain-2',
            'code' => 'UL02',
            'status' => 'active',
        ]);

        $this->withToken($superToken)->postJson('/api/v1/users', [
            'name' => 'User B',
            'email' => 'userb2@univ-lain.test',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'hrd',
            'institution_id' => $otherInstitution->id,
        ])->assertCreated();

        $userB = User::where('email', 'userb2@univ-lain.test')->firstOrFail();

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->getJson("/api/v1/users/{$userB->id}")->assertStatus(403);
        $this->withToken($adminToken)->putJson("/api/v1/users/{$userB->id}", ['name' => 'X'])->assertStatus(403);
        $this->withToken($adminToken)->deleteJson("/api/v1/users/{$userB->id}")->assertStatus(403);
    }

    public function test_deactivating_user_revokes_their_tokens(): void
    {
        $target = User::create([
            'name' => 'Target',
            'email' => 'target@revoke.test',
            'password' => 'password',
            'institution_id' => $this->demoInstitution()->id,
            'is_active' => true,
        ]);
        $target->assignRole('hrd');

        $targetToken = $target->createToken('test-token')->plainTextToken;

        // Token works before deactivation.
        $this->withToken($targetToken)->getJson('/api/v1/auth/me')->assertOk();

        // Super admin deactivates the target.
        $superToken = $this->loginAs('superadmin@tracerconnect.test');
        $this->withToken($superToken)
            ->putJson("/api/v1/users/{$target->id}", ['is_active' => false])
            ->assertOk();

        // Token is revoked afterwards.
        $this->withToken($targetToken)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_institution_admin_cannot_manage_fellow_institution_admin(): void
    {
        $superToken = $this->loginAs('superadmin@tracerconnect.test');
        $institution = $this->demoInstitution();

        $fellow = $this->withToken($superToken)->postJson('/api/v1/users', [
            'name' => 'Admin Lain',
            'email' => 'admin2@smkn1tracer.sch.id',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'institution_admin',
            'institution_id' => $institution->id,
        ])->assertCreated()->json('data');

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->putJson("/api/v1/users/{$fellow['id']}", ['name' => 'X'])->assertStatus(403);
        $this->withToken($adminToken)->deleteJson("/api/v1/users/{$fellow['id']}")->assertStatus(403);
    }

    public function test_roles_and_permissions_require_admin_permission(): void
    {
        $operator = User::create([
            'name' => 'Operator Biasa',
            'email' => 'operator-biasa@test.test',
            'password' => 'password',
            'institution_id' => $this->demoInstitution()->id,
            'is_active' => true,
        ]);
        $operator->assignRole('hrd');
        $token = $operator->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/roles')->assertStatus(403);
        $this->withToken($token)->getJson('/api/v1/permissions')->assertStatus(403);
    }

    public function test_super_admin_can_update_and_soft_delete_user(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');
        $institution = $this->demoInstitution();

        $created = $this->withToken($token)->postJson('/api/v1/users', [
            'name' => 'Akan Dihapus',
            'email' => 'delete-me@test.test',
            'password' => 'password',
            'password_confirmation' => 'password',
            'role' => 'hrd',
            'institution_id' => $institution->id,
        ])->assertCreated()->json('data');

        $this->withToken($token)->putJson("/api/v1/users/{$created['id']}", [
            'name' => 'Nama Baru',
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.name', 'Nama Baru');

        $this->withToken($token)->deleteJson("/api/v1/users/{$created['id']}")->assertOk();

        $this->assertSoftDeleted('users', ['id' => $created['id']]);
    }
}
