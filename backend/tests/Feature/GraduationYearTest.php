<?php

namespace Tests\Feature;

use App\Models\GraduationYear;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GraduationYearTest extends TestCase
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

    public function test_admin_institusi_can_create_graduation_year(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->postJson('/api/v1/graduation-years', [
            'year' => 2026,
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.year', 2026)
            ->assertJsonPath('data.institution_id', $this->demoInstitution()->id);
    }

    public function test_duplicate_year_in_same_institution_returns_422(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/graduation-years', ['year' => 2024])->assertStatus(422);
    }

    public function test_tenant_isolation_cannot_view_other_institution_year(): void
    {
        $other = GraduationYear::create([
            'institution_id' => Institution::factory()->create()->id,
            'year' => 2020,
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/graduation-years/{$other->id}")->assertStatus(403);
        $this->withToken($token)->deleteJson("/api/v1/graduation-years/{$other->id}")->assertStatus(403);
    }

    public function test_admin_institusi_list_only_own_years(): void
    {
        $superToken = $this->loginAs('superadmin@tracerconnect.test');
        $otherInstitution = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-year',
            'code' => 'IL02',
            'status' => 'active',
        ]);

        $this->withToken($superToken)->postJson('/api/v1/graduation-years', [
            'institution_id' => $otherInstitution->id,
            'year' => 2018,
        ])->assertCreated();

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($adminToken)->getJson('/api/v1/graduation-years')->assertOk();

        $years = collect($response->json('data'))->pluck('year');
        $this->assertNotContains(2018, $years);
        $this->assertContains(2024, $years);
    }
}
