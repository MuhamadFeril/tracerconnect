<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\JobVacancy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedJobTest extends TestCase
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

    public function test_alumni_can_save_and_list_job(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/save')
            ->assertCreated()
            ->assertJsonPath('data.job_vacancy_id', $this->vacancy()->id);

        $this->withToken($token)->getJson('/api/v1/saved-jobs')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.job.title', 'Software Engineer');
    }

    public function test_saving_twice_is_idempotent(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $url = '/api/v1/job-vacancies/'.$this->vacancy()->id.'/save';

        $this->withToken($token)->postJson($url)->assertCreated();
        $this->withToken($token)->postJson($url)->assertOk();

        $this->assertDatabaseCount('saved_jobs', 1);
    }

    public function test_alumni_can_unsave_job(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $url = '/api/v1/job-vacancies/'.$this->vacancy()->id.'/save';

        $this->withToken($token)->postJson($url)->assertCreated();
        $this->withToken($token)->deleteJson($url)->assertOk();

        $this->assertDatabaseCount('saved_jobs', 0);
    }

    public function test_unsaving_without_bookmark_is_idempotent(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->deleteJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/save')
            ->assertOk();
    }

    public function test_cannot_save_foreign_institution_job(): void
    {
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-save',
            'code' => 'IL10',
            'status' => 'active',
        ]);
        $foreign = JobVacancy::create([
            'institution_id' => $other->id,
            'title' => 'Lowongan Luar',
            'company_name' => 'PT Luar',
            'status' => 'published',
        ]);

        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$foreign->id.'/save')->assertStatus(403);
    }

    public function test_cannot_save_unpublished_job(): void
    {
        $job = JobVacancy::create([
            'institution_id' => $this->demoInstitution()->id,
            'title' => 'Lowongan Draft',
            'company_name' => 'PT Draft',
            'status' => 'draft',
        ]);

        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$job->id.'/save')->assertStatus(403);
    }

    public function test_job_listing_includes_alumni_flags(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/save')->assertCreated();
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/apply')->assertCreated();

        $this->withToken($token)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Software Engineer')
            ->assertJsonPath('data.0.is_saved', true)
            ->assertJsonPath('data.0.has_applied', true);
    }

    public function test_saved_jobs_are_scoped_to_owner(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $this->withToken($token)->postJson('/api/v1/job-vacancies/'.$this->vacancy()->id.'/save');

        $otherToken = $this->loginAs('dewi.anggraini@example.com');

        $this->withToken($otherToken)->getJson('/api/v1/saved-jobs')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }
}
