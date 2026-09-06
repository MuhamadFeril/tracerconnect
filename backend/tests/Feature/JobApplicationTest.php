<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    private function publishedVacancy(): JobVacancy
    {
        return JobVacancy::factory()->create([
            'institution_id' => $this->demoInstitution()->id,
            'status' => 'published',
        ]);
    }

    public function test_alumni_can_apply_to_published_vacancy(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        $this->withToken($token)->postJson("/api/v1/job-vacancies/{$vacancy->id}/apply", [
            'cover_letter' => 'Saya tertarik dengan posisi ini.',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.job_vacancy_id', $vacancy->id);

        $this->assertDatabaseHas('job_applications', [
            'job_vacancy_id' => $vacancy->id,
            'status' => 'submitted',
        ]);
    }

    public function test_apply_is_not_throttled_by_unrelated_request_activity(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        // Simulate a busy minute of page loads/polling on other throttled
        // endpoints. Rate-limit keys are scoped per route, so this read
        // traffic must NOT drain the 10/min quota of the apply endpoint.
        for ($i = 0; $i < 11; $i++) {
            $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();
        }

        $this->withToken($token)->postJson("/api/v1/job-vacancies/{$vacancy->id}/apply", [
            'cover_letter' => 'Saya tertarik dengan posisi ini.',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'submitted');
    }

    public function test_alumni_cannot_apply_twice(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        $this->withToken($token)->postJson("/api/v1/job-vacancies/{$vacancy->id}/apply")
            ->assertCreated();
        $this->withToken($token)->postJson("/api/v1/job-vacancies/{$vacancy->id}/apply")
            ->assertStatus(422);
    }

    public function test_alumni_cannot_apply_to_foreign_or_unpublished_vacancy(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $foreign = JobVacancy::factory()->create([
            'institution_id' => Institution::create([
                'name' => 'Lain', 'slug' => 'lain-apply', 'code' => 'LA01', 'status' => 'active',
            ])->id,
            'status' => 'published',
        ]);
        $draft = JobVacancy::factory()->create([
            'institution_id' => $this->demoInstitution()->id,
            'status' => 'draft',
        ]);

        $this->withToken($token)->postJson("/api/v1/job-vacancies/{$foreign->id}/apply")->assertStatus(422);
        $this->withToken($token)->postJson("/api/v1/job-vacancies/{$draft->id}/apply")->assertStatus(422);
    }

    public function test_alumni_can_withdraw_application(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        $application = $this->withToken($token)->postJson("/api/v1/job-vacancies/{$vacancy->id}/apply")
            ->assertCreated()->json('data');

        $this->withToken($token)->postJson("/api/v1/applications/{$application['id']}/withdraw")
            ->assertOk()
            ->assertJsonPath('data.status', 'withdrawn');
    }

    public function test_my_applications_only_returns_own(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        $this->withToken($token)->postJson("/api/v1/job-vacancies/{$vacancy->id}/apply")->assertCreated();

        $this->withToken($token)->getJson('/api/v1/applications/my')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.job_vacancy_id', $vacancy->id);
    }

    public function test_admin_can_update_application_status(): void
    {
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');
        $alumniToken = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        $application = $this->withToken($alumniToken)->postJson("/api/v1/job-vacancies/{$vacancy->id}/apply")
            ->assertCreated()->json('data');

        $this->withToken($adminToken)->putJson("/api/v1/applications/{$application['id']}/status", [
            'status' => 'interview',
        ])->assertOk()
            ->assertJsonPath('data.status', 'interview');
    }

    public function test_admin_cannot_update_status_of_withdrawn_application(): void
    {
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');
        $alumniToken = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        $application = $this->withToken($alumniToken)->postJson("/api/v1/job-vacancies/{$vacancy->id}/apply")
            ->assertCreated()->json('data');
        $this->withToken($alumniToken)->postJson("/api/v1/applications/{$application['id']}/withdraw")->assertOk();

        $this->withToken($adminToken)->putJson("/api/v1/applications/{$application['id']}/status", [
            'status' => 'accepted',
        ])->assertStatus(422);
    }

    public function test_alumni_can_bookmark_and_unbookmark(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        $this->withToken($token)->postJson("/api/v1/job-vacancies/{$vacancy->id}/bookmark")
            ->assertOk()
            ->assertJsonPath('data.bookmarked', true);

        $this->assertDatabaseHas('job_bookmarks', [
            'job_vacancy_id' => $vacancy->id,
        ]);

        $this->withToken($token)->deleteJson("/api/v1/job-vacancies/{$vacancy->id}/bookmark")
            ->assertOk()
            ->assertJsonPath('data.bookmarked', false);

        $this->assertDatabaseMissing('job_bookmarks', [
            'job_vacancy_id' => $vacancy->id,
        ]);
    }

    public function test_apply_with_cv_upload_stores_file(): void
    {
        Storage::fake('public');

        $token = $this->loginAs('andi.pratama@example.com');
        $vacancy = $this->publishedVacancy();

        $this->withToken($token)->post("/api/v1/job-vacancies/{$vacancy->id}/apply", [
            'cover_letter' => 'Lampiran CV',
            'cv' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.cv_path', fn ($value) => $value !== null && str_contains($value, 'applications/cv/'));

        Storage::disk('public')->assertExists(JobApplication::first()->cv_path);
    }
}
