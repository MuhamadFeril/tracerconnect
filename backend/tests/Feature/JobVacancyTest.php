<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\JobVacancy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobVacancyTest extends TestCase
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

    public function test_admin_can_create_job_vacancy(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'Backend Developer',
            'company_name' => 'PT Solusi Data',
            'description' => 'Membangun REST API.',
            'location' => 'Surabaya',
            'employment_type' => 'full_time',
            'application_link' => 'https://example.com/apply/backend',
            'status' => 'published',
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Backend Developer')
            ->assertJsonPath('data.institution_id', $this->demoInstitution()->id);
    }

    public function test_invalid_employment_type_returns_422(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'Posisi Aneh',
            'company_name' => 'PT X',
            'employment_type' => 'unlimited',
            'status' => 'draft',
        ])->assertStatus(422);
    }

    public function test_job_vacancies_are_tenant_scoped(): void
    {
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-job',
            'code' => 'IL07',
            'status' => 'active',
        ]);

        $foreign = JobVacancy::create([
            'institution_id' => $other->id,
            'title' => 'Lowongan Rahasia',
            'company_name' => 'PT Rahasia',
            'status' => 'published',
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/job-vacancies/{$foreign->id}")->assertStatus(403);
        $this->withToken($token)->putJson("/api/v1/job-vacancies/{$foreign->id}", ['title' => 'X'])->assertStatus(403);
        $this->withToken($token)->deleteJson("/api/v1/job-vacancies/{$foreign->id}")->assertStatus(403);
    }

    public function test_filters_for_status_and_employment_type(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson('/api/v1/job-vacancies?employment_type=internship')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Desainer Grafis (Magang)');

        $this->withToken($token)->getJson('/api/v1/job-vacancies?status=closed')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        $this->withToken($token)->getJson('/api/v1/job-vacancies?search=Nusantara')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_alumni_role_can_view_published_jobs(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonPath('meta.total', 3);
    }

    public function test_employer_role_can_create_job_vacancy(): void
    {
        $employer = User::create([
            'name' => 'HR Teknologi',
            'email' => 'hr@teknologi.test',
            'password' => 'password',
            'institution_id' => $this->demoInstitution()->id,
            'is_active' => true,
        ]);
        $employer->assignRole('employer');

        $token = $employer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'UI/UX Designer',
            'company_name' => 'PT Kreatif',
            'status' => 'draft',
        ])->assertCreated();
    }
}
