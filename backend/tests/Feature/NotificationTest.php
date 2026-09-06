<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Institution;
use App\Models\User;
use App\Notifications\InAppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function makeAlumni(Institution $institution): User
    {
        $user = User::factory()->create([
            'institution_id' => $institution->id,
            'is_active' => true,
        ]);
        $user->assignRole('alumni');

        return $user;
    }

    private function makeInstitutionAdmin(Institution $institution): User
    {
        $user = User::factory()->create([
            'institution_id' => $institution->id,
            'is_active' => true,
        ]);
        $user->assignRole('institution_admin');

        return $user;
    }

    public function test_publishing_announcement_notifies_institution_alumni(): void
    {
        $institution = Institution::factory()->create();
        $alumni = $this->makeAlumni($institution);
        $otherAlumni = $this->makeAlumni(Institution::factory()->create());
        $admin = $this->makeInstitutionAdmin($institution);
        $token = $admin->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/announcements', [
            'title' => 'Pengumuman Notifikasi',
            'body' => 'Isi pengumuman',
            'status' => 'published',
        ])->assertStatus(201);

        $this->assertSame(1, $alumni->notifications()->count());
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $alumni->id,
            'type' => InAppNotification::class,
        ]);

        // Alumni from other institutions are never notified.
        $this->assertSame(0, $otherAlumni->notifications()->count());
    }

    public function test_draft_does_not_notify_and_update_to_published_does(): void
    {
        $institution = Institution::factory()->create();
        $alumni = $this->makeAlumni($institution);
        $admin = $this->makeInstitutionAdmin($institution);
        $token = $admin->createToken('test-token')->plainTextToken;

        $announcement = Announcement::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'draft',
        ]);

        $this->withToken($token)->putJson("/api/v1/announcements/{$announcement->id}", [
            'status' => 'published',
        ])->assertOk();

        $this->assertSame(1, $alumni->notifications()->count());

        // Updating a published announcement does not spam duplicates.
        $this->withToken($token)->putJson("/api/v1/announcements/{$announcement->id}", [
            'body' => 'Perubahan kecil',
        ])->assertOk();

        $this->assertSame(1, $alumni->notifications()->count());
    }

    public function test_alumni_can_list_own_notifications(): void
    {
        $institution = Institution::factory()->create();
        $alumni = $this->makeAlumni($institution);
        $alumni->notify(new InAppNotification('Judul A', 'Isi A', '/pengumuman', 'announcement'));
        $alumni->notify(new InAppNotification('Judul B', 'Isi B', null, 'event'));

        $token = $alumni->createToken('test-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure(['data' => [['id', 'title', 'body', 'url', 'kind', 'read_at']]]);

        // Both created in the same second; only membership is asserted.
        $titles = collect($response->json('data'))->pluck('title');
        $this->assertContains('Judul A', $titles);
        $this->assertContains('Judul B', $titles);
    }

    public function test_notifications_are_scoped_to_the_current_user(): void
    {
        $institution = Institution::factory()->create();
        $alumniA = $this->makeAlumni($institution);
        $alumniB = $this->makeAlumni($institution);

        $alumniA->notify(new InAppNotification('Hanya A', 'Isi', null, 'info'));

        $tokenB = $alumniB->createToken('test-token')->plainTextToken;

        $this->withToken($tokenB)->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_mark_read_and_unread_count(): void
    {
        $institution = Institution::factory()->create();
        $alumni = $this->makeAlumni($institution);
        $alumni->notify(new InAppNotification('Satu', 'Isi', null, 'info'));
        $alumni->notify(new InAppNotification('Dua', 'Isi', null, 'info'));

        $all = $alumni->notifications()->get();
        $first = $all->first();
        $second = $all->last();

        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 2);

        $readResponse = $this->withToken($token)->postJson("/api/v1/notifications/{$first->id}/read")
            ->assertOk();
        $this->assertNotNull($readResponse->json('data.read_at'));

        $this->withToken($token)->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 1);

        // Reading an already-read notification is idempotent.
        $this->withToken($token)->postJson("/api/v1/notifications/{$first->id}/read")->assertOk();

        $this->withToken($token)->postJson('/api/v1/notifications/read-all')->assertOk();

        $this->withToken($token)->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 0);

        $this->assertDatabaseMissing('notifications', [
            'id' => $second->id,
            'read_at' => null,
        ]);
    }

    public function test_marking_unknown_notification_returns_404(): void
    {
        $institution = Institution::factory()->create();
        $alumni = $this->makeAlumni($institution);
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/notifications/00000000-0000-0000-0000-000000000000/read')
            ->assertStatus(404);
    }

    public function test_notification_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/notifications')->assertStatus(401);
        $this->getJson('/api/v1/notifications/unread-count')->assertStatus(401);
        $this->postJson('/api/v1/notifications/read-all')->assertStatus(401);
        $this->postJson('/api/v1/notifications/fcm-token', ['token' => 'x'])->assertStatus(401);
        $this->deleteJson('/api/v1/notifications/fcm-token', ['token' => 'x'])->assertStatus(401);
    }

    public function test_user_can_register_and_remove_fcm_token(): void
    {
        $institution = Institution::factory()->create();
        $alumni = $this->makeAlumni($institution);
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/notifications/fcm-token', [
            'token' => 'fcm-token-abc-123',
            'platform' => 'android',
        ])->assertOk();

        $this->assertDatabaseHas('fcm_tokens', [
            'user_id' => $alumni->id,
            'token' => 'fcm-token-abc-123',
            'platform' => 'android',
        ]);

        // Re-registering the same token is idempotent (no duplicate row).
        $this->withToken($token)->postJson('/api/v1/notifications/fcm-token', [
            'token' => 'fcm-token-abc-123',
            'platform' => 'ios',
        ])->assertOk();
        $this->assertSame(1, $alumni->fcmTokens()->count());
        $this->assertSame('ios', $alumni->fcmTokens()->first()->platform);

        $this->withToken($token)->deleteJson('/api/v1/notifications/fcm-token', [
            'token' => 'fcm-token-abc-123',
        ])->assertOk();

        $this->assertDatabaseMissing('fcm_tokens', ['token' => 'fcm-token-abc-123']);
    }

    public function test_fcm_token_follows_the_latest_owner(): void
    {
        $institution = Institution::factory()->create();
        $alumniA = $this->makeAlumni($institution);
        $alumniB = $this->makeAlumni($institution);

        $this->withToken($alumniA->createToken('t')->plainTextToken)
            ->postJson('/api/v1/notifications/fcm-token', ['token' => 'shared-token'])
            ->assertOk();

        // The same device signs into another account → token moves with it.
        $this->withToken($alumniB->createToken('t')->plainTextToken)
            ->postJson('/api/v1/notifications/fcm-token', ['token' => 'shared-token'])
            ->assertOk();

        $this->assertDatabaseHas('fcm_tokens', ['user_id' => $alumniB->id, 'token' => 'shared-token']);
        $this->assertDatabaseMissing('fcm_tokens', ['user_id' => $alumniA->id, 'token' => 'shared-token']);
    }

    public function test_fcm_token_list_is_bounded_per_user(): void
    {
        $institution = Institution::factory()->create();
        $alumni = $this->makeAlumni($institution);
        $token = $alumni->createToken('test-token')->plainTextToken;

        for ($i = 1; $i <= 7; $i++) {
            $this->withToken($token)->postJson('/api/v1/notifications/fcm-token', [
                'token' => "fcm-token-{$i}",
            ])->assertOk();
        }

        // Only the 5 newest tokens are kept.
        $this->assertSame(5, $alumni->fcmTokens()->count());
        $this->assertDatabaseMissing('fcm_tokens', ['token' => 'fcm-token-1']);
        $this->assertDatabaseMissing('fcm_tokens', ['token' => 'fcm-token-2']);
        $this->assertDatabaseHas('fcm_tokens', ['token' => 'fcm-token-7']);
    }
}
