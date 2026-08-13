<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\BlockedUser;
use App\Models\Connection;
use App\Models\Institution;
use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NetworkingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function makeAlumniUser(Institution $institution, array $attributes = []): User
    {
        $user = User::factory()->create(['institution_id' => $institution->id, 'is_active' => true] + $attributes);
        $user->assignRole('alumni');
        Alumni::factory()->create([
            'institution_id' => $institution->id,
            'user_id' => $user->id,
            'email' => $user->email,
        ] + $attributes);

        return $user;
    }

    public function test_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/networking/alumni')->assertStatus(401);
        $this->postJson('/api/v1/networking/connections', ['receiver_id' => fake()->uuid()])->assertStatus(401);
        $this->postJson('/api/v1/networking/block', ['blocked_id' => fake()->uuid()])->assertStatus(401);
        $this->postJson('/api/v1/networking/report', ['reported_id' => fake()->uuid(), 'reason' => 'spam'])->assertStatus(401);
    }

    public function test_alumni_can_see_only_same_institution_alumni(): void
    {
        $institution = Institution::factory()->create();
        $other = Institution::factory()->create();

        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);
        $outsider = $this->makeAlumniUser($other);

        $token = $me->createToken('test-token')->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/v1/networking/alumni')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertSame($peer->alumni->id, $response->json('data.0.id'));
        $this->assertNotEquals($outsider->alumni->id, $response->json('data.0.id'));
    }

    public function test_directory_excludes_self_and_reports_connection_status(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        // Connected peer appears as connected.
        Connection::create([
            'requester_id' => $me->id,
            'receiver_id' => $peer->id,
            'status' => 'connected',
        ]);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/networking/alumni')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.connection.status', 'connected')
            ->assertJsonPath('data.0.connection.connection_id', Connection::first()->id);
    }

    public function test_directory_marks_pending_requests_both_directions(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peerA = $this->makeAlumniUser($institution);
        $peerB = $this->makeAlumniUser($institution);

        // I sent to A, B sent to me.
        Connection::create(['requester_id' => $me->id, 'receiver_id' => $peerA->id, 'status' => 'pending']);
        Connection::create(['requester_id' => $peerB->id, 'receiver_id' => $me->id, 'status' => 'pending']);

        $token = $me->createToken('test-token')->plainTextToken;

        $data = $this->withToken($token)->getJson('/api/v1/networking/alumni')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->json('data');

        $byId = collect($data)->keyBy('user_id');
        $this->assertSame('pending_outgoing', $byId[$peerA->id]['connection']['status']);
        $this->assertSame('pending_incoming', $byId[$peerB->id]['connection']['status']);
    }

    public function test_alumni_can_send_connection_request(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/networking/connections', ['receiver_id' => $peer->id])
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.direction', 'outgoing');

        $this->assertDatabaseHas('connections', [
            'requester_id' => $me->id,
            'receiver_id' => $peer->id,
            'status' => 'pending',
        ]);

        // Receiver got an in-app notification.
        $this->assertSame(1, $peer->notifications()->count());
    }

    public function test_cannot_request_self_or_duplicate(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/networking/connections', ['receiver_id' => $me->id])
            ->assertStatus(422);

        $this->withToken($token)->postJson('/api/v1/networking/connections', ['receiver_id' => $peer->id])
            ->assertStatus(201);

        $this->withToken($token)->postJson('/api/v1/networking/connections', ['receiver_id' => $peer->id])
            ->assertStatus(422);
    }

    public function test_cannot_request_alumni_outside_institution(): void
    {
        $institution = Institution::factory()->create();
        $other = Institution::factory()->create();

        $me = $this->makeAlumniUser($institution);
        $outsider = $this->makeAlumniUser($other);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/networking/connections', ['receiver_id' => $outsider->id])
            ->assertStatus(422);

        $this->assertDatabaseCount('connections', 0);
    }

    public function test_receiver_can_accept_and_requester_is_notified(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $connection = Connection::create(['requester_id' => $me->id, 'receiver_id' => $peer->id, 'status' => 'pending']);

        $token = $peer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson("/api/v1/networking/connections/{$connection->id}/accept")
            ->assertOk()
            ->assertJsonPath('data.status', 'connected');

        $this->assertDatabaseHas('connections', [
            'id' => $connection->id,
            'status' => 'connected',
            'action_user_id' => $peer->id,
        ]);

        $this->assertSame(1, $me->notifications()->count());
    }

    public function test_only_receiver_can_accept(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $connection = Connection::create(['requester_id' => $me->id, 'receiver_id' => $peer->id, 'status' => 'pending']);

        // The requester cannot accept their own request.
        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson("/api/v1/networking/connections/{$connection->id}/accept")
            ->assertStatus(403);

        $this->assertDatabaseHas('connections', ['id' => $connection->id, 'status' => 'pending']);
    }

    public function test_receiver_can_reject(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $connection = Connection::create(['requester_id' => $me->id, 'receiver_id' => $peer->id, 'status' => 'pending']);

        $token = $peer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson("/api/v1/networking/connections/{$connection->id}/reject")
            ->assertOk();

        $this->assertDatabaseMissing('connections', ['id' => $connection->id]);
    }

    public function test_requester_can_cancel_and_either_party_can_remove(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peerPending = $this->makeAlumniUser($institution);
        $peerConnected = $this->makeAlumniUser($institution);

        $pending = Connection::create(['requester_id' => $me->id, 'receiver_id' => $peerPending->id, 'status' => 'pending']);
        $connected = Connection::create(['requester_id' => $me->id, 'receiver_id' => $peerConnected->id, 'status' => 'connected']);

        $token = $me->createToken('test-token')->plainTextToken;

        // Cancel pending request.
        $this->withToken($token)->deleteJson("/api/v1/networking/connections/{$pending->id}")->assertOk();
        $this->assertDatabaseMissing('connections', ['id' => $pending->id]);

        // Remove connected connection from the other side.
        $peerToken = $peerConnected->createToken('test-token')->plainTextToken;
        $this->withToken($peerToken)->deleteJson("/api/v1/networking/connections/{$connected->id}")->assertOk();
        $this->assertDatabaseMissing('connections', ['id' => $connected->id]);
    }

    public function test_block_removes_connections_and_hides_from_directory(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $connection = Connection::create(['requester_id' => $me->id, 'receiver_id' => $peer->id, 'status' => 'connected']);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/networking/block', ['blocked_id' => $peer->id])
            ->assertOk();

        $this->assertDatabaseHas('blocked_users', ['blocker_id' => $me->id, 'blocked_id' => $peer->id]);
        $this->assertDatabaseMissing('connections', ['id' => $connection->id]);

        // Blocked users vanish from both directories.
        $this->withToken($token)->getJson('/api/v1/networking/alumni')->assertOk()->assertJsonCount(0, 'data');

        $peerToken = $peer->createToken('test-token')->plainTextToken;
        $this->withToken($peerToken)->getJson('/api/v1/networking/alumni')->assertOk()->assertJsonCount(0, 'data');

        // And no new requests may be sent to a blocked user.
        $this->withToken($peerToken)->postJson('/api/v1/networking/connections', ['receiver_id' => $me->id])
            ->assertStatus(422);
    }

    public function test_user_can_list_and_unblock_own_blocks(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $block = BlockedUser::create(['blocker_id' => $me->id, 'blocked_id' => $peer->id]);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/networking/blocked')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.user.id', $peer->id);

        $this->withToken($token)->deleteJson("/api/v1/networking/blocked/{$block->id}")
            ->assertOk();

        $this->assertDatabaseMissing('blocked_users', ['id' => $block->id]);
        $this->withToken($token)->getJson('/api/v1/networking/blocked')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_cannot_unblock_other_users_block(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);
        $other = $this->makeAlumniUser($institution);

        $block = BlockedUser::create(['blocker_id' => $me->id, 'blocked_id' => $peer->id]);

        // A third user cannot unblock someone else's block.
        $token = $other->createToken('test-token')->plainTextToken;

        $this->withToken($token)->deleteJson("/api/v1/networking/blocked/{$block->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('blocked_users', ['id' => $block->id]);
    }

    public function test_blocked_profile_is_hidden(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        BlockedUser::create(['blocker_id' => $me->id, 'blocked_id' => $peer->id]);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson("/api/v1/networking/alumni/{$peer->alumni->id}")
            ->assertStatus(404);
    }

    public function test_alumni_can_report_user(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/networking/report', [
            'reported_id' => $peer->id,
            'reason' => 'spam',
            'details' => 'Mengirim konten tidak pantas',
        ])->assertStatus(201);

        $this->assertDatabaseHas('reports', [
            'reporter_id' => $me->id,
            'reported_id' => $peer->id,
            'reason' => 'spam',
            'status' => 'pending',
        ]);
    }

    public function test_report_requires_reason(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peer = $this->makeAlumniUser($institution);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/networking/report', ['reported_id' => $peer->id])
            ->assertStatus(422);

        $this->assertDatabaseCount('reports', 0);
    }

    public function test_non_alumni_cannot_access_networking(): void
    {
        $institution = Institution::factory()->create();
        $admin = User::factory()->create(['institution_id' => $institution->id]);
        $admin->assignRole('institution_admin');
        $token = $admin->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/networking/alumni')->assertStatus(403);
    }

    public function test_connections_and_requests_lists(): void
    {
        $institution = Institution::factory()->create();
        $me = $this->makeAlumniUser($institution);
        $peerA = $this->makeAlumniUser($institution);
        $peerB = $this->makeAlumniUser($institution);

        Connection::create(['requester_id' => $me->id, 'receiver_id' => $peerA->id, 'status' => 'connected']);
        Connection::create(['requester_id' => $peerB->id, 'receiver_id' => $me->id, 'status' => 'pending']);

        $token = $me->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/networking/connections')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'connected')
            ->assertJsonPath('data.0.direction', 'outgoing')
            ->assertJsonPath('data.0.user.id', $peerA->id);

        $this->withToken($token)->getJson('/api/v1/networking/requests')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'pending')
            ->assertJsonPath('data.0.direction', 'incoming')
            ->assertJsonPath('data.0.user.id', $peerB->id);
    }
}
