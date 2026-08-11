<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InstitutionTest extends TestCase
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

    public function test_super_admin_can_create_institution(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');

        $response = $this->withToken($token)->postJson('/api/v1/institutions', [
            'name' => 'Universitas Nusantara',
            'slug' => 'universitas-nusantara',
            'code' => 'UN01',
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Universitas Nusantara')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('institutions', ['slug' => 'universitas-nusantara']);
    }

    public function test_super_admin_can_list_institutions(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');

        $this->withToken($token)
            ->getJson('/api/v1/institutions')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data');
    }

    public function test_super_admin_can_update_and_soft_delete_institution(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');

        $institutionId = $this->withToken($token)->getJson('/api/v1/institutions')->json('data.0.id');

        $this->withToken($token)->putJson("/api/v1/institutions/{$institutionId}", [
            'name' => 'SMK Negeri 1 Tracer Baru',
            'status' => 'trial',
        ])->assertOk()->assertJsonPath('data.name', 'SMK Negeri 1 Tracer Baru');

        $this->withToken($token)->deleteJson("/api/v1/institutions/{$institutionId}")->assertOk();

        $this->assertSoftDeleted('institutions', ['id' => $institutionId]);
    }

    public function test_institution_admin_cannot_create_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/institutions', [
            'name' => 'Tidak Boleh',
            'slug' => 'tidak-boleh',
            'status' => 'active',
        ])->assertStatus(403);
    }

    public function test_institution_admin_cannot_list_institutions(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson('/api/v1/institutions')->assertStatus(403);
    }

    public function test_institution_admin_can_view_own_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $institutionId = $this->withToken($token)->getJson('/api/v1/auth/me')->json('data.institution_id');

        $this->withToken($token)
            ->getJson("/api/v1/institutions/{$institutionId}")
            ->assertOk()
            ->assertJsonPath('data.id', $institutionId);
    }

    public function test_institution_admin_cannot_view_other_institution(): void
    {
        $other = Institution::create([
            'name' => 'Universitas Terpisah',
            'slug' => 'universitas-terpisah',
            'code' => 'UT01',
            'status' => 'active',
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/institutions/{$other->id}")->assertStatus(403);
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/v1/institutions')->assertStatus(401);
    }

    public function test_duplicate_slug_returns_422(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');

        $this->withToken($token)->postJson('/api/v1/institutions', [
            'name' => 'Duplikat',
            'slug' => 'smk-negeri-1-tracer',
            'status' => 'active',
        ])->assertStatus(422);
    }
}
