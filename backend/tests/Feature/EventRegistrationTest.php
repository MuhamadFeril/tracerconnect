<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventRegistrationTest extends TestCase
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

    private function publishedEvent(): Event
    {
        return Event::factory()->create([
            'institution_id' => $this->demoInstitution()->id,
            'status' => 'published',
        ]);
    }

    public function test_alumni_can_register_and_unregister(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $event = $this->publishedEvent();

        $this->withToken($token)->postJson("/api/v1/events/{$event->id}/register")
            ->assertCreated()
            ->assertJsonPath('data.registered', true);

        $this->assertDatabaseHas('event_registrations', ['event_id' => $event->id]);

        $this->withToken($token)->deleteJson("/api/v1/events/{$event->id}/register")
            ->assertOk()
            ->assertJsonPath('data.registered', false);

        $this->assertDatabaseMissing('event_registrations', ['event_id' => $event->id]);
    }

    public function test_alumni_cannot_register_twice(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $event = $this->publishedEvent();

        $this->withToken($token)->postJson("/api/v1/events/{$event->id}/register")->assertCreated();
        $this->withToken($token)->postJson("/api/v1/events/{$event->id}/register")->assertStatus(422);
    }

    public function test_alumni_cannot_register_foreign_or_draft_event(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $foreign = Event::factory()->create([
            'institution_id' => Institution::create([
                'name' => 'Lain', 'slug' => 'lain-event', 'code' => 'LE01', 'status' => 'active',
            ])->id,
            'status' => 'published',
        ]);
        $draft = Event::factory()->create([
            'institution_id' => $this->demoInstitution()->id,
            'status' => 'draft',
        ]);

        // Foreign events are blocked by the view policy entirely.
        $this->withToken($token)->postJson("/api/v1/events/{$foreign->id}/register")->assertStatus(403);
        $this->withToken($token)->postJson("/api/v1/events/{$draft->id}/register")->assertStatus(422);
    }

    public function test_staff_can_list_participants_and_mark_attendance(): void
    {
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');
        $alumniToken = $this->loginAs('andi.pratama@example.com');
        $event = $this->publishedEvent();

        $this->withToken($alumniToken)->postJson("/api/v1/events/{$event->id}/register")->assertCreated();

        $participants = $this->withToken($adminToken)->getJson("/api/v1/events/{$event->id}/participants")
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $registrationId = $participants->json('data.0.id');

        $this->withToken($adminToken)->postJson("/api/v1/events/{$event->id}/participants/{$registrationId}/attendance", [
            'attended' => true,
        ])->assertOk()
            ->assertJsonPath('data.attended', true);
    }

    public function test_alumni_sees_registration_state_in_event_detail(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');
        $event = $this->publishedEvent();

        $this->withToken($token)->getJson("/api/v1/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('data.registered', false);

        $this->withToken($token)->postJson("/api/v1/events/{$event->id}/register")->assertCreated();

        $this->withToken($token)->getJson("/api/v1/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('data.registered', true);
    }
}
