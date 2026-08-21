<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentTest extends TestCase
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

    public function test_institution_admin_can_create_department_in_own_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->postJson('/api/v1/departments', [
            'name' => 'Akuntansi',
            'code' => 'AK',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Akuntansi')
            ->assertJsonPath('data.institution_id', $this->demoInstitution()->id);
    }

    public function test_institution_admin_lists_only_own_departments(): void
    {
        $superToken = $this->loginAs('superadmin@tracerconnect.test');
        $otherInstitution = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-dep',
            'code' => 'IL01',
            'status' => 'active',
        ]);

        $this->withToken($superToken)->postJson('/api/v1/departments', [
            'institution_id' => $otherInstitution->id,
            'name' => 'Jurusan Rahasia',
        ])->assertCreated();

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($adminToken)->getJson('/api/v1/departments')->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertNotContains('Jurusan Rahasia', $names);
        $this->assertContains('Rekayasa Perangkat Lunak', $names);
    }

    public function test_tenant_isolation_cannot_view_other_institution_department(): void
    {
        $other = Department::create([
            'institution_id' => Institution::factory()->create()->id,
            'name' => 'Jurusan Terpisah',
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/departments/{$other->id}")->assertStatus(403);
        $this->withToken($token)->putJson("/api/v1/departments/{$other->id}", ['name' => 'X'])->assertStatus(403);
    }

    public function test_duplicate_department_name_in_same_institution_returns_422(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/departments', [
            'name' => 'Rekayasa Perangkat Lunak',
        ])->assertStatus(422);
    }

    public function test_alumni_cannot_create_department(): void
    {
        $institution = $this->demoInstitution();

        $alumni = User::create([
            'name' => 'Alumni Dept',
            'email' => 'alumni-dep@test.test',
            'password' => 'password',
            'institution_id' => $institution->id,
            'is_active' => true,
        ]);
        $alumni->assignRole('alumni');
        $alumniToken = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($alumniToken)->postJson('/api/v1/departments', [
            'name' => 'Alumni Dept',
        ])->assertStatus(403);
    }

    public function test_super_admin_can_update_and_delete_department(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');
        $departmentId = $this->withToken($token)->getJson('/api/v1/departments?institution_id='.$this->demoInstitution()->id)
            ->json('data.0.id');

        $this->withToken($token)->putJson("/api/v1/departments/{$departmentId}", ['name' => 'Nama Baru'])->assertOk();
        $this->withToken($token)->deleteJson("/api/v1/departments/{$departmentId}")->assertOk();
        $this->assertSoftDeleted('departments', ['id' => $departmentId]);
    }
}
