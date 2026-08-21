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

        // Internships come from both EngagementSeeder and EmployerSeeder.
        $this->withToken($token)->getJson('/api/v1/job-vacancies?employment_type=internship')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonFragment(['title' => 'Desainer Grafis (Magang)'])
            ->assertJsonFragment(['title' => 'Quality Assurance Intern']);

        $this->withToken($token)->getJson('/api/v1/job-vacancies?status=closed')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        // The employer seeder posts several vacancies for PT Teknologi Nusantara.
        $this->withToken($token)->getJson('/api/v1/job-vacancies?search=Nusantara')
            ->assertOk()
            ->assertJsonPath('meta.total', 3);
    }

    public function test_alumni_role_can_view_published_jobs(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        // 3 vacancies from EngagementSeeder + 4 new ones from EmployerSeeder.
        $this->withToken($token)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonPath('meta.total', 7);
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

    public function test_employer_job_is_cross_school_without_institution(): void
    {
        // Employers are platform-level: their vacancies are announced to
        // every school, so institution_id stays null.
        $employer = User::factory()->create();
        $employer->assignRole('employer');
        $token = $employer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'Magang Data Analyst',
            'company_name' => 'PT Analytics Nusantara',
            'employment_type' => 'internship',
            'status' => 'published',
        ])->assertCreated()
            ->assertJsonPath('data.institution_id', null)
            ->assertJsonPath('data.created_by', $employer->id);
    }

    public function test_employer_index_lists_only_own_vacancies(): void
    {
        $employer = User::factory()->create();
        $employer->assignRole('employer');
        $token = $employer->createToken('test-token')->plainTextToken;

        $mine = $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'Lowongan Saya',
            'company_name' => 'PT Saya',
            'status' => 'draft',
        ])->json('data.id');

        // A foreign vacancy posted by someone else must not appear.
        $foreign = JobVacancy::create([
            'institution_id' => $this->demoInstitution()->id,
            'title' => 'Lowongan Orang Lain',
            'company_name' => 'PT Lain',
            'status' => 'published',
            'created_by' => User::factory()->create()->id,
        ]);

        $this->withToken($token)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $mine);

        $this->assertNotSame($mine, $foreign->id);
    }

    public function test_alumni_from_other_school_sees_cross_school_employer_job(): void
    {
        $other = Institution::create([
            'name' => 'SMK Lain', 'slug' => 'smk-lain-job', 'code' => 'SMK99', 'status' => 'active',
        ]);

        $employer = User::factory()->create();
        $employer->assignRole('employer');
        $employerToken = $employer->createToken('test-token')->plainTextToken;

        $this->withToken($employerToken)->postJson('/api/v1/job-vacancies', [
            'title' => 'Lowongan Lintas Sekolah',
            'company_name' => 'PT Sejahtera',
            'status' => 'published',
        ])->assertCreated();

        // Alumni of a different school must see the cross-school vacancy.
        $alumni = User::factory()->create(['institution_id' => $other->id]);
        $alumni->assignRole('alumni');
        $alumniToken = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($alumniToken)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonFragment(['title' => 'Lowongan Lintas Sekolah']);

        // A school-scoped vacancy of another institution stays hidden.
        $scoped = JobVacancy::create([
            'institution_id' => $this->demoInstitution()->id,
            'title' => 'Lowongan Khusus Sekolah A',
            'company_name' => 'PT A',
            'status' => 'published',
        ]);

        $this->withToken($alumniToken)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonMissing(['title' => 'Lowongan Khusus Sekolah A']);

        $this->assertNotSame($scoped->id, '');
    }
}
