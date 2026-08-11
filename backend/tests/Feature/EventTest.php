<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EventTest extends TestCase
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

    public function test_admin_can_create_event_in_own_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/events', [
            'title' => 'Wisuda Angkatan 2026',
            'description' => 'Prosesi wisuda lulusan.',
            'location' => 'Aula Utama',
            'starts_at' => '2026-12-10T09:00:00',
            'ends_at' => '2026-12-10T13:00:00',
            'status' => 'published',
        ])->assertCreated()
            ->assertJsonPath('data.title', 'Wisuda Angkatan 2026')
            ->assertJsonPath('data.institution_id', $this->demoInstitution()->id);
    }

    public function test_ends_at_before_starts_at_returns_422(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/events', [
            'title' => 'Salah Waktu',
            'starts_at' => '2026-12-10T13:00:00',
            'ends_at' => '2026-12-10T09:00:00',
            'status' => 'draft',
        ])->assertStatus(422);
    }

    public function test_events_are_tenant_scoped(): void
    {
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-event',
            'code' => 'IL06',
            'status' => 'active',
        ]);

        $foreign = Event::create([
            'institution_id' => $other->id,
            'title' => 'Acara Rahasia',
            'starts_at' => now(),
            'status' => 'published',
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/events/{$foreign->id}")->assertStatus(403);
        $this->withToken($token)->putJson("/api/v1/events/{$foreign->id}", ['title' => 'X'])->assertStatus(403);
        $this->withToken($token)->deleteJson("/api/v1/events/{$foreign->id}")->assertStatus(403);
    }

    public function test_upcoming_filter_returns_future_events(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $titles = collect($this->withToken($token)->getJson('/api/v1/events?upcoming=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 2) // both seeded events are in the future
            ->json('data'))->pluck('title');

        $this->assertTrue($titles->contains('Career Day 2026'));
        $this->assertTrue($titles->contains('Seminar Kewirausahaan'));
    }

    public function test_alumni_role_can_view_events(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->getJson('/api/v1/events')->assertOk();
    }
}
