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

        // Internships come from both EngagementSeeder and HrdSeeder.
        $this->withToken($token)->getJson('/api/v1/job-vacancies?employment_type=internship')
            ->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonFragment(['title' => 'Desainer Grafis (Magang)'])
            ->assertJsonFragment(['title' => 'Quality Assurance Intern']);

        $this->withToken($token)->getJson('/api/v1/job-vacancies?status=closed')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        // The hrd seeder posts several vacancies for PT Teknologi Nusantara.
        $this->withToken($token)->getJson('/api/v1/job-vacancies?search=Nusantara')
            ->assertOk()
            ->assertJsonPath('meta.total', 3);
    }

    public function test_alumni_role_can_view_published_jobs(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        // 3 vacancies from EngagementSeeder + 4 new ones from HrdSeeder.
        $this->withToken($token)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonPath('meta.total', 7);
    }

    public function test_hrd_role_can_create_job_vacancy(): void
    {
        $hrd = User::create([
            'name' => 'HR Teknologi',
            'email' => 'hr@teknologi.test',
            'password' => 'password',
            'institution_id' => $this->demoInstitution()->id,
            'is_active' => true,
        ]);
        $hrd->assignRole('hrd');

        $token = $hrd->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'UI/UX Designer',
            'company_name' => 'PT Kreatif',
            'status' => 'draft',
        ])->assertCreated();
    }

    public function test_hrd_vacancy_company_is_forced_to_account_pt_name(): void
    {
        // HRD account carries the company (PT) name…
        $hrd = User::factory()->create(['company_name' => 'PT Teknologi Nusantara']);
        $hrd->assignRole('hrd');
        $token = $hrd->createToken('test-token')->plainTextToken;

        // …so a different submitted company is overridden server-side.
        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'Software Engineer',
            'company_name' => 'PT Salah Ketik',
            'status' => 'draft',
        ])->assertCreated()
            ->assertJsonPath('data.company_name', 'PT Teknologi Nusantara');

        // Legacy HRD account without a PT yet: the first submitted name is
        // adopted and stored on the account from then on.
        $legacy = User::factory()->create();
        $legacy->assignRole('hrd');
        $legacyToken = $legacy->createToken('test-token')->plainTextToken;

        $this->withToken($legacyToken)->postJson('/api/v1/job-vacancies', [
            'title' => 'Data Analyst',
            'company_name' => 'PT Analytics Nusantara',
            'status' => 'draft',
        ])->assertCreated()
            ->assertJsonPath('data.company_name', 'PT Analytics Nusantara');

        $this->assertSame('PT Analytics Nusantara', $legacy->fresh()->company_name);
    }

    public function test_hrd_job_is_cross_school_without_institution(): void
    {
        // HRDs are platform-level: their vacancies are announced to
        // every school, so institution_id stays null.
        $hrd = User::factory()->create();
        $hrd->assignRole('hrd');
        $token = $hrd->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'Magang Data Analyst',
            'company_name' => 'PT Analytics Nusantara',
            'employment_type' => 'internship',
            'status' => 'published',
        ])->assertCreated()
            ->assertJsonPath('data.institution_id', null)
            ->assertJsonPath('data.created_by', $hrd->id);
    }

    public function test_hrd_index_lists_only_own_vacancies(): void
    {
        $hrd = User::factory()->create();
        $hrd->assignRole('hrd');
        $token = $hrd->createToken('test-token')->plainTextToken;

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

    public function test_alumni_from_other_school_sees_cross_school_hrd_job(): void
    {
        $other = Institution::create([
            'name' => 'SMK Lain', 'slug' => 'smk-lain-job', 'code' => 'SMK99', 'status' => 'active',
        ]);

        $hrd = User::factory()->create();
        $hrd->assignRole('hrd');
        $hrdToken = $hrd->createToken('test-token')->plainTextToken;

        $this->withToken($hrdToken)->postJson('/api/v1/job-vacancies', [
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
