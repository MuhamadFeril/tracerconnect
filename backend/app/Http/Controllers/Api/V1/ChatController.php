<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\ReportConversationRequest;
use App\Http\Requests\Chat\StoreConversationRequest;
use App\Http\Requests\Chat\StoreMessageRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\BlockedUser;
use App\Models\Connection;
use App\Models\Conversation;
use App\Models\ConversationParticipant;
use App\Models\ConversationReport;
use App\Models\JobVacancy;
use App\Models\Message;
use App\Models\MessageRead;
use App\Models\User;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ChatController extends Controller
{
    /**
     * The viewer's conversations (both sides of each direct chat), each with
     * the other party, the latest message, and the unread count.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Conversation::class);

        /** @var User $user */
        $user = $request->user();
        $search = addcslashes(trim((string) $request->search), '%_\\');

        $perPage = max(1, min($request->integer('per_page', 20), 50));

        $conversations = Conversation::query()
            ->forUser($user->id)
            ->with([
                'participants.user',
                'jobVacancy:id,title,company_name',
                'messages' => fn ($query) => $query->withTrashed()->latest()->limit(1),
            ])
            ->withCount(['messages as unread_count' => function ($query) use ($user) {
                $query->where('sender_id', '!=', $user->id)
                    ->whereNull('deleted_at')
                    ->whereNotExists(function ($sub) use ($user) {
                        $sub->selectRaw('1')
                            ->from('message_reads')
                            ->whereColumn('message_reads.message_id', 'messages.id')
                            ->where('message_reads.user_id', $user->id);
                    });
            }])
            ->when($search !== '', fn ($query) => $query->whereHas('participants.user', function ($q) use ($search, $user) {
                $q->where('id', '!=', $user->id)
                    ->where('name', 'like', "%{$search}%");
            }))
            ->orderByRaw('COALESCE(last_message_at, created_at) DESC')
            ->paginate($perPage);

        $data = $conversations->through(fn (Conversation $conversation) => new ConversationResource($conversation, $user->id));

        return ApiResponse::success($data, 'Daftar percakapan berhasil diambil', ApiResponse::paginationMeta($conversations));
    }

    /**
     * Total unread incoming messages across the viewer's conversations.
     * Lightweight counterpart of the per-conversation unread counts in
     * index() — powers the chat badge next to the notification bell.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Conversation::class);

        /** @var User $user */
        $user = $request->user();

        // Optimized: Use a single query with join instead of subquery
        $count = Message::query()
            ->join('conversation_participants', 'messages.conversation_id', '=', 'conversation_participants.conversation_id')
            ->where('conversation_participants.user_id', $user->id)
            ->where('messages.sender_id', '!=', $user->id)
            ->whereNull('messages.deleted_at')
            ->whereNotExists(function ($sub) use ($user) {
                $sub->selectRaw('1')
                    ->from('message_reads')
                    ->whereColumn('message_reads.message_id', 'messages.id')
                    ->where('message_reads.user_id', $user->id);
            })
            ->count();

        return ApiResponse::success(['count' => $count], 'Jumlah pesan belum dibaca berhasil diambil');
    }

    /**
     * Get the institution admin for the current user's institution.
     * Used by alumni to initiate a chat with their school admin.
     */
    public function institutionAdmin(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->institution_id) {
            return ApiResponse::success(null, 'Tidak ada institusi terkait');
        }

        $admin = User::query()
            ->whereHas('roles', fn ($q) => $q->where('name', 'admin_institusi'))
            ->where('institution_id', $user->institution_id)
            ->first(['id', 'name', 'avatar_path']);

        if (! $admin) {
            return ApiResponse::success(null, 'Admin institusi tidak ditemukan');
        }

        return ApiResponse::success([
            'id' => $admin->id,
            'name' => $admin->name,
            'avatar_url' => $admin->avatar_path ? asset('storage/'.$admin->avatar_path) : null,
        ], 'Admin institusi berhasil diambil');
    }

    /**
     * Start a conversation, or return the existing one between the same two
     * parties (with the same job context). Backend-enforced rules:
     * - cannot chat with yourself
     * - neither side may have blocked the other
     * - alumni-alumni requires a confirmed connection in the same institution
     * - institution staff may message alumni of their institution
     * - job conversations are only allowed between the job creator and the
     *   other party
     */
    public function store(StoreConversationRequest $request): JsonResponse
    {
        $this->authorize('create', Conversation::class);

        /** @var User $user */
        $user = $request->user();
        $other = null;
        $job = null;

        if ($request->filled('user_id')) {
            $other = User::find($request->user_id);

            if (! $other) {
                return ApiResponse::error('Pengguna tujuan tidak ditemukan', [], 422);
            }

            if ($other->id === $user->id) {
                return ApiResponse::error('Tidak dapat memulai chat dengan diri sendiri', [], 422);
            }
        }

        if ($request->filled('job_vacancy_id')) {
            $job = JobVacancy::find($request->job_vacancy_id);

            if (! $job) {
                return ApiResponse::error('Lowongan tidak ditemukan', [], 422);
            }

            // The other party of a job conversation is the job creator, unless
            // the caller already picked the other user explicitly.
            if (! $other && $job->created_by && $job->created_by !== $user->id) {
                $other = User::find($job->created_by);
            }
        }

        if (! $other) {
            return ApiResponse::error('Tidak dapat menentukan lawan bicara', [], 422);
        }

        if ($this->isBlocked($user->id, $other->id)) {
            return ApiResponse::error('Tidak dapat memulai chat dengan pengguna ini', [], 422);
        }

        if ($job) {
            // The job creator may always initiate; any alumni may contact the
            // creator of a published vacancy without needing approval first
            // (cross-school hrd vacancies included).
            $isCreator = $job->created_by === $user->id;
            $alumniMayChatJob = $user->hasRole('alumni') && $job->status === 'published';

            if (! ($isCreator || $alumniMayChatJob)) {
                throw ValidationException::withMessages([
                    'job_vacancy_id' => 'Chat lowongan hanya untuk pembuat lowongan atau alumni pada lowongan yang dipublikasikan.',
                ]);
            }

            // Verify the other party belongs to the same institution for
            // institution-scoped job vacancies (cross-school vacancies have
            // institution_id = null). The job creator is always allowed.
            if ($job->institution_id !== null && $other->id !== $job->created_by && $other->institution_id !== $job->institution_id) {
                throw ValidationException::withMessages([
                    'job_vacancy_id' => 'Pengguna tujuan bukan dari institusi yang sama dengan lowongan ini.',
                ]);
            }
        } else {
            $this->assertDirectChatAllowed($user, $other);
        }

        $existing = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('user_id', $user->id))
            ->whereHas('participants', fn ($q) => $q->where('user_id', $other->id))
            ->when($job, fn ($q) => $q->where('job_vacancy_id', $job->id), fn ($q) => $q->whereNull('job_vacancy_id'))
            ->first();

        if ($existing) {
            $existing->load(['participants.user', 'jobVacancy:id,title,company_name', 'messages' => fn ($q) => $q->withTrashed()->latest()->limit(1)]);

            return ApiResponse::success(new ConversationResource($existing, $user->id), 'Percakapan ditemukan');
        }

        $conversation = DB::transaction(function () use ($user, $other, $job, $request) {
            $conversation = Conversation::create([
                'type' => 'direct',
                'subject' => $job?->title,
                'job_vacancy_id' => $job?->id,
                'created_by' => $user->id,
            ]);

            ConversationParticipant::insert([
                [
                    'id' => (string) Str::uuid(),
                    'conversation_id' => $conversation->id,
                    'user_id' => $user->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => (string) Str::uuid(),
                    'conversation_id' => $conversation->id,
                    'user_id' => $other->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);

            return $conversation;
        });

        $conversation->load(['participants.user', 'jobVacancy:id,title,company_name', 'messages' => fn ($q) => $q->withTrashed()->latest()->limit(1)]);

        return ApiResponse::success(new ConversationResource($conversation, $user->id), 'Percakapan berhasil dibuat', [], 201);
    }

    /**
     * Conversation detail (participants only).
     */
    public function show(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorize('view', $conversation);

        /** @var User $user */
        $user = $request->user();

        $conversation->load(['participants.user', 'jobVacancy:id,title,company_name', 'messages' => fn ($q) => $q->withTrashed()->latest()->limit(1)]);

        return ApiResponse::success(new ConversationResource($conversation, $user->id), 'Detail percakapan berhasil diambil');
    }

    /**
     * Paginated message history, newest first (the client renders it
     * bottom-up). Soft-deleted messages are included as placeholders so both
     * sides see "message deleted" instead of a gap.
     */
    public function messages(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorize('view', $conversation);

        /** @var User $user */
        $user = $request->user();

        $perPage = max(1, min($request->integer('per_page', 30), 100));

        $select = [
            'id', 'conversation_id', 'sender_id', 'type', 'body',
            'attachment_path', 'attachment_name', 'attachment_mime', 'attachment_size',
            'deleted_at', 'created_at', 'updated_at',
        ];

        // Cursor pagination (stable across new messages arriving):
        // - no cursor            -> newest $perPage messages, newest first
        // - before=<id>          -> messages older than <id> (for "load older")
        // - after=<id>           -> messages newer than <id> (delta, for polling)
        // The cursor is a message id; we compare on (created_at, id) so two
        // messages sharing a timestamp never break the ordering or duplicate.
        $after = $request->input('after');
        $before = $request->input('before');
        $isDelta = false;

        $query = $conversation->messages()
            ->withTrashed()
            ->select($select);

        if ($after) {
            $cursor = DB::table('messages')->where('id', $after)->select('created_at', 'id')->first();
            if ($cursor) {
                $query->where(function ($q) use ($cursor) {
                    $q->where('created_at', '>', $cursor->created_at)
                        ->orWhere(fn ($q2) => $q2->where('created_at', $cursor->created_at)->where('id', '>', $cursor->id));
                })->oldest();
                $isDelta = true;
            } else {
                $query->latest();
            }
        } elseif ($before) {
            $cursor = DB::table('messages')->where('id', $before)->select('created_at', 'id')->first();
            if ($cursor) {
                $query->where(function ($q) use ($cursor) {
                    $q->where('created_at', '<', $cursor->created_at)
                        ->orWhere(fn ($q2) => $q2->where('created_at', $cursor->created_at)->where('id', '<', $cursor->id));
                })->latest();
            } else {
                $query->latest();
            }
        } else {
            $query->latest();
        }

        // Fetch one extra row to know whether older messages remain, without
        // exposing an unbounded result set.
        $rows = $query->limit($perPage + 1)->get();

        $hasMoreOlder = false;
        if (! $isDelta && $rows->count() > $perPage) {
            $hasMoreOlder = true;
            $rows = $rows->slice(0, $perPage)->values();
        }

        $data = $rows->map(fn (Message $message) => new MessageResource($message, $user->id))->values();

        // Cursors depend on sort direction: "after" returns ascending (oldest
        // of the delta first, newest last); the other modes return newest-first.
        $oldestCursor = $isDelta ? $rows->first()?->id : $rows->last()?->id;
        $newestCursor = $isDelta ? $rows->last()?->id : $rows->first()?->id;

        $meta = [
            'oldest_cursor' => $oldestCursor,
            'newest_cursor' => $newestCursor,
            'has_more_older' => $hasMoreOlder,
            'per_page' => $perPage,
            // Backward-compatible keys for any offset-based consumer.
            'current_page' => 1,
            'last_page' => $hasMoreOlder ? 2 : 1,
            'total' => $rows->count(),
        ];

        return ApiResponse::success($data, 'Riwayat pesan berhasil diambil', $meta);
    }

    /**
     * Send a text/image/file message. Blocked users (either direction) are
     * frozen out: no new messages can be sent.
     */
    public function send(Conversation $conversation, StoreMessageRequest $request): JsonResponse
    {
        $this->authorize('update', $conversation);

        /** @var User $user */
        $user = $request->user();

        $other = $conversation->participants()->where('user_id', '!=', $user->id)->first()?->user_id;

        if ($other && $this->isBlocked($user->id, $other)) {
            return ApiResponse::error('Tidak dapat mengirim pesan: pengguna ini diblokir', [], 403);
        }

        $attributes = [
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'type' => $request->type,
            'body' => $request->type === 'text' ? $request->body : ($request->filled('body') ? $request->body : null),
        ];

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attributes['attachment_path'] = $file->store('conversations', 'public');
            // Sanitize filename: remove path traversal, null bytes, and dangerous chars
            $attributes['attachment_name'] = $this->sanitizeFilename($file->getClientOriginalName());
            $attributes['attachment_mime'] = $file->getMimeType();
            $attributes['attachment_size'] = $file->getSize();
        }

        $message = DB::transaction(function () use ($conversation, $user, $attributes) {
            $message = Message::create($attributes);

            $conversation->update(['last_message_at' => now()]);

            // The sender has seen the conversation up to this point.
            ConversationParticipant::query()
                ->where('conversation_id', $conversation->id)
                ->where('user_id', $user->id)
                ->update(['last_read_at' => now()]);

            return $message;
        });

        // In-app notification for the other participant (unless they muted
        // the conversation) so the unread badge updates without polling only
        // the chat endpoint.
        $this->notifyOtherParticipant($conversation, $user, $message);

        return ApiResponse::success(new MessageResource($message, $user->id), 'Pesan terkirim', [], 201);
    }

    /**
     * Delete your own message (soft delete — the other side sees a
     * "message deleted" placeholder).
     */
    public function destroyMessage(Message $message): JsonResponse
    {
        $this->authorize('delete', $message);

        $message->delete();

        return ApiResponse::success([], 'Pesan berhasil dihapus');
    }

    /**
     * Mark every incoming message as read and record the read timestamp.
     */
    public function markRead(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorize('view', $conversation);

        /** @var User $user */
        $user = $request->user();

        $now = now();

        // Optimized: Use raw query to mark all unread messages as read
        // in a single query instead of fetching each message first.
        $unreadIds = Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('deleted_at')
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
            ->pluck('id');

        if ($unreadIds->isNotEmpty()) {
            // Batch insert read records
            $readRecords = $unreadIds->map(fn ($id) => [
                'id' => (string) Str::uuid(),
                'message_id' => $id,
                'user_id' => $user->id,
                'read_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all();

            // Chunk insert for large batches
            foreach (array_chunk($readRecords, 100) as $chunk) {
                MessageRead::insert($chunk);
            }
        }

        ConversationParticipant::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->update(['last_read_at' => $now]);

        return ApiResponse::success(['unread_count' => 0], 'Semua pesan ditandai sudah dibaca');
    }

    /**
     * Mute / unmute the conversation for the viewer (per-participant).
     */
    public function mute(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorize('update', $conversation);

        /** @var User $user */
        $user = $request->user();

        $participant = ConversationParticipant::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $muted = $request->has('muted')
            ? $request->boolean('muted')
            : $participant->muted_at === null;

        $participant->update(['muted_at' => $muted ? now() : null]);

        return ApiResponse::success(['muted' => $muted], $muted ? 'Percakapan dibisukan' : 'Bisukan percakapan dihapus');
    }

    /**
     * Report a conversation for review (one report per user per conversation).
     */
    public function report(Conversation $conversation, ReportConversationRequest $request): JsonResponse
    {
        $this->authorize('view', $conversation);

        /** @var User $user */
        $user = $request->user();

        ConversationReport::firstOrCreate(
            [
                'conversation_id' => $conversation->id,
                'reporter_id' => $user->id,
            ],
            [
                'reason' => $request->reason,
                'description' => $request->description,
            ]
        );

        return ApiResponse::success([], 'Laporan percakapan berhasil dikirim', [], 201);
    }

    /**
     * Create an in-app notification for the other participant when a new
     * message arrives. Skipped when they muted the conversation or when no
     * other participant exists.
     */
    private function notifyOtherParticipant(Conversation $conversation, User $sender, Message $message): void
    {
        $participant = ConversationParticipant::query()
            ->with('user')
            ->where('conversation_id', $conversation->id)
            ->where('user_id', '!=', $sender->id)
            ->first();

        if (! $participant || $participant->muted_at !== null || ! $participant->user) {
            return;
        }

        $preview = match ($message->type) {
            'image' => '📷 Mengirim foto',
            'file' => '📎 '.($message->attachment_name ?? 'Mengirim file'),
            default => mb_strimwidth((string) $message->body, 0, 80, '…'),
        };

        NotificationService::notifyUser(
            $participant->user,
            'Pesan baru',
            $sender->name.': '.$preview,
            "/chat/{$conversation->id}",
            'chat'
        );
    }

    /**
     * Alumni-alumni chat requires a confirmed connection within the same
     * institution; alumni may chat with their institution admin; institution
     * staff may message alumni of their institution.
     */
    private function assertDirectChatAllowed(User $user, User $other): void
    {
        $userIsAlumni = $user->hasRole('alumni');
        $otherIsAlumni = $other->hasRole('alumni');
        $sameInstitution = $user->institution_id && $user->institution_id === $other->institution_id;

        if ($userIsAlumni && $otherIsAlumni) {
            if (! $sameInstitution) {
                throw ValidationException::withMessages([
                    'user_id' => 'Alumni hanya dapat berchat dengan alumni di institusi yang sama.',
                ]);
            }

            $connected = Connection::query()
                ->where('status', 'connected')
                ->between($user->id, $other->id)
                ->exists();

            if (! $connected) {
                throw ValidationException::withMessages([
                    'user_id' => 'Hubungkan terlebih dahulu sebelum memulai chat.',
                ]);
            }

            return;
        }

        // Alumni can chat with their institution's admin (admin_institusi).
        if ($userIsAlumni && $other->hasRole('admin_institusi') && $sameInstitution) {
            return;
        }

        // Institution staff (admin_institusi) can reach alumni of their
        // institution; super admins reach anyone.
        if (! $userIsAlumni && $user->hasPermissionTo('chat.send')) {
            if ($sameInstitution || ($user->hasRole('admin_institusi') && $user->institution_id === null)) {
                return;
            }

            throw ValidationException::withMessages([
                'user_id' => 'Pengguna tujuan tidak ditemukan.',
            ]);
        }

        throw ValidationException::withMessages([
            'user_id' => 'Tidak dapat memulai chat dengan pengguna ini.',
        ]);
    }

    /**
     * Whether either user has blocked the other.
     */
    private function isBlocked(string $firstUserId, string $secondUserId): bool
    {
        return BlockedUser::query()
            ->where(fn ($query) => $query
                ->where('blocker_id', $firstUserId)->where('blocked_id', $secondUserId)
                ->orWhere('blocker_id', $secondUserId)->where('blocked_id', $firstUserId))
            ->exists();
    }

    /**
     * Sanitize a user-provided filename to prevent path traversal,
     * null byte injection, and other filename-based attacks.
     */
    private function sanitizeFilename(string $filename): string
    {
        // Remove path components (keep only basename)
        $filename = basename($filename);

        // Remove null bytes
        $filename = str_replace(chr(0), '', $filename);

        // Remove path traversal sequences
        $filename = str_replace(['../', '..\\', '..\\\\'], '', $filename);

        // Replace dangerous characters with underscores
        $filename = preg_replace('/[^a-zA-Z0-9._\-]/', '_', $filename);

        // Collapse multiple underscores
        $filename = preg_replace('/_+/', '_', $filename);

        // Trim underscores from ends
        $filename = trim($filename, '_');

        // Fallback if empty
        return $filename ?: 'attachment';
    }
}
