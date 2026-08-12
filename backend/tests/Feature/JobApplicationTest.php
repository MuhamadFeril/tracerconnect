<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\User;
use App\Notifications\InAppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class JobApplicationTest extends TestCase
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

    private function vacancy(string $title = 'Software Engineer'): JobVacancy
    {
        return JobVacancy::where('title', $title)->where('institution_id', $this->demoInstitution()->id)->firstOrFail();
    }

    public function test_alumni_can_apply_to_published_job(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply', [
            'message' => 'Saya tertarik dan memiliki pengalaman 2 tahun.',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.job.title', 'Software Engineer')
            ->assertJsonPath('data.job_vacancy_id', $this->vacancy()->id);

        // Staff of the institution are notified about the new application.
        $this->assertDatabaseHas('notifications', [
            'type' => InAppNotification::class,
            'notifiable_id' => User::where('email', 'admin@smkn1tracer.sch.id')->value('id'),
        ]);
    }

    public function test_duplicate_application_is_idempotent(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $url = '/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply';

        $this->withToken($token)->postJson($url)->assertCreated();
        $this->withToken($token)->postJson($url)->assertOk();

        $this->assertDatabaseCount('job_applications', 1);
    }

    public function test_alumni_cannot_apply_to_foreign_institution_job(): void
    {
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-apply',
            'code' => 'IL08',
            'status' => 'active',
        ]);
        $foreign = JobVacancy::create([
            'institution_id' => $other->id,
            'title' => 'Lowongan Luar',
            'company_name' => 'PT Luar',
            'status' => 'published',
        ]);

        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$foreign->id.'/apply')->assertStatus(403);
    }

    public function test_alumni_cannot_apply_to_unpublished_job(): void
    {
        $job = JobVacancy::create([
            'institution_id' => $this->demoInstitution()->id,
            'title' => 'Lowongan Tertutup',
            'company_name' => 'PT Tutup',
            'status' => 'closed',
        ]);

        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$job->id.'/apply')->assertStatus(403);
    }

    public function test_staff_can_list_applications_with_filters(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply');

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->getJson('/api/v1/job-applications')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.applicant.name', 'Andi Pratama');

        $this->withToken($adminToken)->getJson('/api/v1/job-applications?status=pending')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->withToken($adminToken)->getJson('/api/v1/job-applications?search=Pratama')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }

    public function test_staff_can_update_application_status_and_notify_applicant(): void
    {
        Notification::fake();

        $token = $this->loginAs('andi.pratama@example.com');
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply');

        $application = JobApplication::firstOrFail();

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->patchJson('/api/v1/job-applications/'.$application->id.'/status', [
            'status' => 'accepted',
        ])->assertOk()
            ->assertJsonPath('data.status', 'accepted');

        Notification::assertSentTo($application->applicant, InAppNotification::class);
    }

    public function test_invalid_status_returns_422(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply');

        $application = JobApplication::firstOrFail();

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->patchJson('/api/v1/job-applications/'.$application->id.'/status', [
            'status' => 'nonsense',
        ])->assertStatus(422);
    }

    public function test_alumni_cannot_update_status(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply');

        $application = JobApplication::firstOrFail();

        $this->withToken($token)->patchJson('/api/v1/job-applications/'.$application->id.'/status', [
            'status' => 'accepted',
        ])->assertStatus(403);
    }

    public function test_alumni_can_withdraw_own_application(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply');

        $application = JobApplication::firstOrFail();

        $this->withToken($token)->deleteJson('/api/v1/job-applications/'.$application->id)
            ->assertOk();

        $this->assertDatabaseMissing('job_applications', ['id' => $application->id]);
    }

    public function test_my_applications_returns_only_own(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply');

        $otherToken = $this->loginAs('dewi.anggraini@example.com');
        $this->withToken($otherToken)->postJson('/api/v1/job-vacancies/'.$this->vacancy('Network Engineer')->id.'/apply');

        $this->withToken($token)->getJson('/api/v1/job-applications/my')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.job.title', 'Software Engineer');
    }

    public function test_applications_are_tenant_scoped(): void
    {
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-scope',
            'code' => 'IL09',
            'status' => 'active',
        ]);
        $foreign = JobVacancy::create([
            'institution_id' => $other->id,
            'title' => 'Lowongan Luar',
            'company_name' => 'PT Luar',
            'status' => 'published',
        ]);
        $foreignApplication = JobApplication::create([
            'job_vacancy_id' => $foreign->id,
            'applicant_id' => User::where('email', 'andi.pratama@example.com')->firstOrFail()->id,
            'status' => 'pending',
        ]);

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->getJson('/api/v1/job-applications')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);

        $this->withToken($adminToken)->patchJson('/api/v1/job-applications/'.$foreignApplication->id.'/status', [
            'status' => 'accepted',
        ])->assertStatus(403);

        $this->withToken($adminToken)->deleteJson('/api/v1/job-applications/'.$foreignApplication->id)
            ->assertStatus(403);
    }

    public function test_admin_job_listing_includes_applications_count(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply');

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonPath('data.0.applications_count', 1);
    }
}
