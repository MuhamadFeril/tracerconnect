<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\Announcement;
use App\Models\Event;
use App\Models\Institution;
use App\Models\JobVacancy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlumniPortalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_public_can_fetch_institution_options(): void
    {
        $response = $this->getJson('/api/v1/institutions/options');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => [['id', 'name']]]);

        foreach ($response->json('data') as $institution) {
            $this->assertSame('active', Institution::find($institution['id'])->status);
        }
    }

    public function test_institution_options_exclude_non_active_institutions(): void
    {
        $suspended = Institution::factory()->create(['status' => 'suspended']);
        $trial = Institution::factory()->create(['status' => 'trial']);

        $this->getJson('/api/v1/institutions/options')
            ->assertOk()
            ->assertJsonMissing(['id' => $suspended->id])
            ->assertJsonMissing(['id' => $trial->id]);
    }

    public function test_alumni_only_sees_published_items_from_own_institution(): void
    {
        $institution = Institution::factory()->create();
        $other = Institution::factory()->create();

        $minePublished = Announcement::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
        ]);
        Announcement::factory()->create(['institution_id' => $institution->id, 'status' => 'draft']);
        Announcement::factory()->create(['institution_id' => $other->id, 'status' => 'published']);

        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/announcements')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $minePublished->id);
    }

    public function test_alumni_without_institution_sees_no_content(): void
    {
        Announcement::factory()->create(['status' => 'published']);

        $alumni = User::factory()->create(['institution_id' => null]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/announcements')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_events_and_jobs_are_also_scoped_for_alumni(): void
    {
        $institution = Institution::factory()->create();
        $other = Institution::factory()->create();

        $myEvent = Event::factory()->create(['institution_id' => $institution->id, 'status' => 'published']);
        Event::factory()->create(['institution_id' => $other->id, 'status' => 'published']);
        Event::factory()->create(['institution_id' => $institution->id, 'status' => 'draft']);

        $myJob = JobVacancy::factory()->create(['institution_id' => $institution->id, 'status' => 'published']);
        JobVacancy::factory()->create(['institution_id' => $other->id, 'status' => 'published']);

        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/events')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $myEvent->id);

        $this->withToken($token)->getJson('/api/v1/job-vacancies')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $myJob->id);
    }

    public function test_alumni_home_returns_scoped_content(): void
    {
        $institution = Institution::factory()->create();
        $other = Institution::factory()->create();

        $announcement = Announcement::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
        ]);
        Announcement::factory()->create(['institution_id' => $institution->id, 'status' => 'draft']);
        Announcement::factory()->create(['institution_id' => $other->id, 'status' => 'published']);

        Event::factory()->create(['institution_id' => $institution->id, 'status' => 'published', 'starts_at' => now()->addDays(3)]);
        Event::factory()->create(['institution_id' => $other->id, 'status' => 'published', 'starts_at' => now()->addDays(5)]);

        $job = JobVacancy::factory()->create(['institution_id' => $institution->id, 'status' => 'published']);
        JobVacancy::factory()->create(['institution_id' => $other->id, 'status' => 'published']);

        $alumniUser = User::factory()->create(['institution_id' => $institution->id]);
        $alumniUser->assignRole('alumni');
        $alumniRecord = Alumni::factory()->create([
            'institution_id' => $institution->id,
            'user_id' => $alumniUser->id,
            'email' => $alumniUser->email,
        ]);
        $token = $alumniUser->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/alumni/home')
            ->assertOk()
            ->assertJsonPath('data.institution.name', $institution->name)
            ->assertJsonPath('data.alumni.id', $alumniRecord->id)
            ->assertJsonCount(1, 'data.announcements')
            ->assertJsonCount(1, 'data.events')
            ->assertJsonCount(1, 'data.jobs')
            ->assertJsonPath('data.announcements.0.id', $announcement->id)
            ->assertJsonPath('data.jobs.0.id', $job->id);
    }

    public function test_alumni_home_requires_authentication(): void
    {
        $this->getJson('/api/v1/alumni/home')->assertStatus(401);
    }
}
