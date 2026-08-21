<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\Institution;
use App\Models\JobAcceptance;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class JobAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function makeEmployer(): User
    {
        $employer = User::factory()->create();
        $employer->assignRole('employer');

        return $employer;
    }

    private function makeAlumni(Institution $institution): User
    {
        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');

        return $alumni;
    }

    private function demoInstitution(): Institution
    {
        return Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail();
    }

    /**
     * An employer creates a cross-school vacancy, an alumni applies, and the
     * employer accepts the application with the full hiring result.
     */
    private function acceptedApplication(string $employerId, string $alumniId): JobApplication
    {
        $vacancy = JobVacancy::create([
            'institution_id' => null,
            'title' => 'Software Engineer',
            'company_name' => 'PT Test',
            'status' => 'published',
            'created_by' => $employerId,
        ]);

        return JobApplication::create([
            'job_vacancy_id' => $vacancy->id,
            'user_id' => $alumniId,
            'alumni_id' => Alumni::where('user_id', $alumniId)->value('id'),
            'status' => 'accepted',
            'applied_at' => now(),
        ]);
    }

    public function test_employer_can_record_hiring_result_for_accepted_application(): void
    {
        $employer = $this->makeEmployer();
        $alumni = $this->makeAlumni($this->demoInstitution());
        $application = $this->acceptedApplication($employer->id, $alumni->id);

        $token = $employer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson("/api/v1/applications/{$application->id}/acceptance", [
            'position_offered' => 'Software Engineer',
            'contract_type' => 'full_time',
            'start_date' => '2026-09-01',
            'salary' => 'Rp 8.000.000 - 10.000.000',
            'notes' => 'Mulai bekerja setelah wisuda.',
        ])->assertOk()
            ->assertJsonPath('data.acceptance.position_offered', 'Software Engineer')
            ->assertJsonPath('data.acceptance.contract_type', 'full_time')
            ->assertJsonPath('data.acceptance.start_date', '2026-09-01')
            ->assertJsonPath('data.acceptance.decided_by', $employer->id);

        $this->assertDatabaseHas('job_acceptances', [
            'job_application_id' => $application->id,
            'position_offered' => 'Software Engineer',
        ]);
    }

    public function test_acceptance_can_be_updated_instead_of_duplicated(): void
    {
        $employer = $this->makeEmployer();
        $alumni = $this->makeAlumni($this->demoInstitution());
        $application = $this->acceptedApplication($employer->id, $alumni->id);

        JobAcceptance::create([
            'job_application_id' => $application->id,
            'job_vacancy_id' => $application->job_vacancy_id,
            'position_offered' => 'Junior Engineer',
            'decided_by' => $employer->id,
            'decided_at' => now(),
        ]);

        $token = $employer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson("/api/v1/applications/{$application->id}/acceptance", [
            'position_offered' => 'Senior Engineer',
            'contract_type' => 'permanent',
        ])->assertOk()
            ->assertJsonPath('data.acceptance.position_offered', 'Senior Engineer');

        $this->assertSame(1, JobAcceptance::where('job_application_id', $application->id)->count());
    }

    public function test_acceptance_rejected_when_application_not_accepted(): void
    {
        $employer = $this->makeEmployer();
        $alumni = $this->makeAlumni($this->demoInstitution());

        $vacancy = JobVacancy::create([
            'institution_id' => null,
            'title' => 'Backend Engineer',
            'company_name' => 'PT Test',
            'status' => 'published',
            'created_by' => $employer->id,
        ]);

        $application = JobApplication::create([
            'job_vacancy_id' => $vacancy->id,
            'user_id' => $alumni->id,
            'status' => 'reviewing',
            'applied_at' => now(),
        ]);

        $token = $employer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson("/api/v1/applications/{$application->id}/acceptance", [
            'position_offered' => 'Backend Engineer',
        ])->assertStatus(422);
    }

    public function test_alumni_cannot_record_acceptance_result(): void
    {
        $employer = $this->makeEmployer();
        $alumni = $this->makeAlumni($this->demoInstitution());
        $application = $this->acceptedApplication($employer->id, $alumni->id);

        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson("/api/v1/applications/{$application->id}/acceptance", [
            'position_offered' => 'Software Engineer',
        ])->assertStatus(403);
    }

    public function test_foreign_employer_cannot_record_acceptance_result(): void
    {
        $employer = $this->makeEmployer();
        $foreign = $this->makeEmployer();
        $alumni = $this->makeAlumni($this->demoInstitution());
        $application = $this->acceptedApplication($employer->id, $alumni->id);

        $token = $foreign->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson("/api/v1/applications/{$application->id}/acceptance", [
            'position_offered' => 'Software Engineer',
        ])->assertStatus(403);
    }

    public function test_invalid_contract_type_rejected(): void
    {
        $employer = $this->makeEmployer();
        $alumni = $this->makeAlumni($this->demoInstitution());
        $application = $this->acceptedApplication($employer->id, $alumni->id);

        $token = $employer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->putJson("/api/v1/applications/{$application->id}/acceptance", [
            'contract_type' => 'unlimited',
        ])->assertStatus(422);
    }

    public function test_cross_school_vacancy_notifies_alumni_of_other_schools(): void
    {
        $other = Institution::create([
            'name' => 'SMK Lain', 'slug' => 'smk-lain-notif', 'code' => 'SMK77', 'status' => 'active',
        ]);

        $alumni = $this->makeAlumni($other);
        $employer = $this->makeEmployer();
        $token = $employer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'Magang Data Engineer',
            'company_name' => 'PT Data Nusantara',
            'employment_type' => 'internship',
            'status' => 'published',
        ])->assertCreated()
            ->assertJsonPath('data.institution_id', null);

        // The alumni of the other school received the broadcast notification.
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $alumni->id,
            'type' => 'App\Notifications\InAppNotification',
        ]);

        $notification = DB::table('notifications')
            ->where('notifiable_id', $alumni->id)
            ->first();

        $this->assertNotNull($notification);
        $this->assertStringContainsString('Magang Data Engineer', $notification->data);
    }

    public function test_school_scoped_vacancy_does_not_notify_other_schools(): void
    {
        $other = Institution::create([
            'name' => 'SMK Lain', 'slug' => 'smk-lain-notif2', 'code' => 'SMK78', 'status' => 'active',
        ]);

        $alumni = $this->makeAlumni($other);
        $institution = $this->demoInstitution();

        $admin = User::where('email', 'admin@smkn1tracer.sch.id')->firstOrFail();
        $token = $admin->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/job-vacancies', [
            'title' => 'Lowongan Khusus SMK 1',
            'company_name' => 'PT Lokal',
            'status' => 'published',
        ])->assertCreated()
            ->assertJsonPath('data.institution_id', $institution->id);

        $this->assertDatabaseMissing('notifications', [
            'notifiable_id' => $alumni->id,
            'type' => 'App\Notifications\InAppNotification',
        ]);
    }
}
