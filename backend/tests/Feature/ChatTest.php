<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\BlockedUser;
use App\Models\Connection;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\Institution;
use App\Models\JobVacancy;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * Two alumni in the same institution with a confirmed connection.
     *
     * @return array{0: Institution, 1: User, 2: User}
     */
    private function connectedAlumni(): array
    {
        $institution = Institution::factory()->create();

        $alumniA = User::factory()->create(['institution_id' => $institution->id]);
        $alumniA->assignRole('alumni');
        Alumni::factory()->create(['user_id' => $alumniA->id, 'institution_id' => $institution->id, 'email' => $alumniA->email]);

        $alumniB = User::factory()->create(['institution_id' => $institution->id]);
        $alumniB->assignRole('alumni');
        Alumni::factory()->create(['user_id' => $alumniB->id, 'institution_id' => $institution->id, 'email' => $alumniB->email]);

        Connection::create([
            'requester_id' => $alumniA->id,
            'receiver_id' => $alumniB->id,
            'status' => 'connected',
        ]);

        return [$institution, $alumniA, $alumniB];
    }

    private function token(User $user): string
    {
        return $user->createToken('test-token')->plainTextToken;
    }

    public function test_connected_alumni_can_start_conversation(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $response = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.other.id', $alumniB->id)
            ->assertJsonPath('data.unread_count', 0);

        $this->assertDatabaseHas('conversation_participants', ['user_id' => $alumniA->id]);
        $this->assertDatabaseHas('conversation_participants', ['user_id' => $alumniB->id]);
    }

    public function test_alumni_requires_connection_before_chat(): void
    {
        $institution = Institution::factory()->create();
        $alumniA = User::factory()->create(['institution_id' => $institution->id]);
        $alumniA->assignRole('alumni');
        $alumniB = User::factory()->create(['institution_id' => $institution->id]);
        $alumniB->assignRole('alumni');

        $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors('user_id');
    }

    public function test_cannot_start_conversation_with_self(): void
    {
        [, $alumniA] = $this->connectedAlumni();

        $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniA->id])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_cannot_start_conversation_with_blocked_user(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        BlockedUser::create(['blocker_id' => $alumniA->id, 'blocked_id' => $alumniB->id]);

        $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_existing_conversation_is_returned_not_duplicated(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $first = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->assertStatus(201)
            ->json('data.id');

        $this->withToken($this->token($alumniB))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniA->id])
            ->assertOk()
            ->assertJsonPath('data.id', $first);

        $this->assertSame(1, Conversation::count());
    }

    public function test_conversation_about_job_between_alumni_and_hrd(): void
    {
        $institution = Institution::factory()->create();
        $hrd = User::factory()->create();
        $hrd->assignRole('hrd');
        $job = JobVacancy::factory()->create(['created_by' => $hrd->id, 'institution_id' => $institution->id]);

        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');

        $this->withToken($this->token($alumni))
            ->postJson('/api/v1/conversations', ['job_vacancy_id' => $job->id])
            ->assertStatus(201)
            ->assertJsonPath('data.other.id', $hrd->id)
            ->assertJsonPath('data.job.id', $job->id);
    }

    public function test_alumni_from_other_institution_can_chat_hrd_without_approval(): void
    {
        // Alumni of any school may contact the recruiter of a published
        // vacancy directly — no connection approval required.
        $institution = Institution::factory()->create();
        $hrd = User::factory()->create();
        $hrd->assignRole('hrd');
        $job = JobVacancy::factory()->create(['created_by' => $hrd->id, 'institution_id' => $institution->id]);

        $stranger = User::factory()->create(); // alumni from another institution
        $stranger->assignRole('alumni');

        $this->withToken($this->token($stranger))
            ->postJson('/api/v1/conversations', ['job_vacancy_id' => $job->id])
            ->assertStatus(201)
            ->assertJsonPath('data.other.id', $hrd->id);
    }

    public function test_job_conversation_denied_for_draft_job(): void
    {
        $institution = Institution::factory()->create();
        $hrd = User::factory()->create();
        $hrd->assignRole('hrd');
        $job = JobVacancy::factory()->create(['created_by' => $hrd->id, 'institution_id' => $institution->id, 'status' => 'draft']);

        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');

        $this->withToken($this->token($alumni))
            ->postJson('/api/v1/conversations', ['job_vacancy_id' => $job->id])
            ->assertStatus(422)
            ->assertJsonValidationErrors('job_vacancy_id');
    }

    public function test_non_participant_cannot_view_or_message(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();
        $outsider = User::factory()->create();
        $outsider->assignRole('alumni');

        $conversation = Conversation::create(['type' => 'direct', 'created_by' => $alumniA->id]);
        ConversationParticipant::insert([
            ['id' => (string) \Illuminate\Support\Str::uuid(), 'conversation_id' => $conversation->id, 'user_id' => $alumniA->id, 'created_at' => now(), 'updated_at' => now()],
            ['id' => (string) \Illuminate\Support\Str::uuid(), 'conversation_id' => $conversation->id, 'user_id' => $alumniB->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->withToken($this->token($outsider))
            ->getJson("/api/v1/conversations/{$conversation->id}")
            ->assertStatus(403);

        $this->withToken($this->token($outsider))
            ->postJson("/api/v1/conversations/{$conversation->id}/messages", ['type' => 'text', 'body' => 'Halo'])
            ->assertStatus(403);
    }

    public function test_send_and_list_messages_with_unread_count(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $this->withToken($this->token($alumniA))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text', 'body' => 'Halo, apa kabar?'])
            ->assertStatus(201)
            ->assertJsonPath('data.is_mine', true)
            ->assertJsonPath('data.body', 'Halo, apa kabar?');

        $this->withToken($this->token($alumniB))
            ->getJson("/api/v1/conversations/{$conversationId}/messages")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // The receiver sees one unread message.
        $this->withToken($this->token($alumniB))
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 1);
    }

    public function test_unread_count_totals_incoming_messages(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        // Two unread messages from alumniA, plus one from alumniB (which is
        // not counted for alumniB).
        foreach (['Pesan 1', 'Pesan 2'] as $body) {
            $this->withToken($this->token($alumniA))
                ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text', 'body' => $body])
                ->assertStatus(201);
        }
        $this->withToken($this->token($alumniB))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text', 'body' => 'Balasan'])
            ->assertStatus(201);

        $this->withToken($this->token($alumniB))
            ->getJson('/api/v1/conversations/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 2);

        // The sender's own messages never count as unread.
        $this->withToken($this->token($alumniA))
            ->getJson('/api/v1/conversations/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 1);
    }

    public function test_send_message_notifies_other_participant(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $this->withToken($this->token($alumniA))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text', 'body' => 'Halo, kabar baik?'])
            ->assertStatus(201);

        $notification = $alumniB->unreadNotifications()->latest()->first();
        $this->assertNotNull($notification);
        $data = $notification->data;
        $this->assertSame('chat', $data['kind']);
        $this->assertSame('Pesan baru', $data['title']);
        $this->assertSame("/chat/{$conversationId}", $data['url']);
        $this->assertStringContainsString($alumniA->name, $data['body']);

        // The unread badge endpoint picks the notification up.
        $this->withToken($this->token($alumniB))
            ->getJson('/api/v1/notifications/unread-count')
            ->assertOk()
            ->assertJsonPath('data.count', 1);
    }

    public function test_muted_participant_is_not_notified(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $this->withToken($this->token($alumniB))
            ->postJson("/api/v1/conversations/{$conversationId}/mute", ['muted' => true])
            ->assertOk();

        $this->withToken($this->token($alumniA))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text', 'body' => 'Halo'])
            ->assertStatus(201);

        $this->assertSame(0, $alumniB->unreadNotifications()->count());
    }

    public function test_blocked_user_cannot_send_message(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        BlockedUser::create(['blocker_id' => $alumniB->id, 'blocked_id' => $alumniA->id]);

        $this->withToken($this->token($alumniA))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text', 'body' => 'Terkirim?'])
            ->assertStatus(403);
    }

    public function test_only_sender_can_delete_message(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $messageId = $this->withToken($this->token($alumniA))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text', 'body' => 'Hapus aku'])
            ->json('data.id');

        $this->withToken($this->token($alumniB))
            ->deleteJson("/api/v1/messages/{$messageId}")
            ->assertStatus(403);

        $this->withToken($this->token($alumniA))
            ->deleteJson("/api/v1/messages/{$messageId}")
            ->assertOk();

        $this->assertSoftDeleted('messages', ['id' => $messageId]);
    }

    public function test_mark_read_clears_unread_count(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $this->withToken($this->token($alumniA))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text', 'body' => 'Pesan baru'])
            ->assertStatus(201);

        $this->withToken($this->token($alumniB))
            ->postJson("/api/v1/conversations/{$conversationId}/read")
            ->assertOk()
            ->assertJsonPath('data.unread_count', 0);

        $this->assertDatabaseHas('message_reads', ['user_id' => $alumniB->id]);

        $this->withToken($this->token($alumniB))
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 0);
    }

    public function test_mute_toggles_per_participant(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $this->withToken($this->token($alumniB))
            ->postJson("/api/v1/conversations/{$conversationId}/mute", ['muted' => true])
            ->assertOk()
            ->assertJsonPath('data.muted', true);

        $this->withToken($this->token($alumniB))
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.muted', true);

        // The other participant is unaffected.
        $this->withToken($this->token($alumniA))
            ->getJson('/api/v1/conversations')
            ->assertOk()
            ->assertJsonPath('data.0.muted', false);
    }

    public function test_report_conversation_is_deduplicated(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $this->withToken($this->token($alumniB))
            ->postJson("/api/v1/conversations/{$conversationId}/report", ['reason' => 'spam', 'description' => 'Pesan tidak pantas'])
            ->assertStatus(201);

        $this->withToken($this->token($alumniB))
            ->postJson("/api/v1/conversations/{$conversationId}/report", ['reason' => 'spam'])
            ->assertStatus(201);

        $this->assertDatabaseCount('conversation_reports', 1);
    }

    public function test_message_validation_requires_attachment_for_files(): void
    {
        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $this->withToken($this->token($alumniA))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'file'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('attachment');

        $this->withToken($this->token($alumniA))
            ->postJson("/api/v1/conversations/{$conversationId}/messages", ['type' => 'text'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('body');
    }

    public function test_file_message_upload(): void
    {
        Storage::fake('public');

        [, $alumniA, $alumniB] = $this->connectedAlumni();

        $conversationId = $this->withToken($this->token($alumniA))
            ->postJson('/api/v1/conversations', ['user_id' => $alumniB->id])
            ->json('data.id');

        $this->withToken($this->token($alumniA))
            ->post("/api/v1/conversations/{$conversationId}/messages", [
                'type' => 'file',
                'body' => 'CV saya',
                'attachment' => UploadedFile::fake()->create('cv.pdf', 200, 'application/pdf'),
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.type', 'file')
            ->assertJsonPath('data.attachment.name', 'cv.pdf');

        $message = Message::query()->latest('id')->firstOrFail();
        Storage::disk('public')->assertExists($message->attachment_path);
    }

    public function test_guest_cannot_access_conversations(): void
    {
        $this->getJson('/api/v1/conversations')->assertStatus(401);
    }
}
