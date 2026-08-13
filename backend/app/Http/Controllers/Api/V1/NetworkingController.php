<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Networking\BlockUserRequest;
use App\Http\Requests\Networking\ReportUserRequest;
use App\Http\Requests\Networking\StoreConnectionRequest;
use App\Http\Resources\ConnectionResource;
use App\Http\Resources\NetworkingAlumniResource;
use App\Models\Alumni;
use App\Models\BlockedUser;
use App\Models\Connection;
use App\Models\Report;
use App\Models\User;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class NetworkingController extends Controller
{
    /**
     * Alumni directory: same-institution alumni with linked accounts,
     * excluding the viewer and anyone blocked in either direction.
     * Each entry carries the connection status relative to the viewer.
     */
    public function alumni(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Connection::class);

        /** @var User $user */
        $user = $request->user();
        $institutionId = $user->institution_id;

        $perPage = max(1, min($request->integer('per_page', 15), 100));
        $search = trim((string) $request->search);

        if (! $institutionId) {
            return ApiResponse::success([], 'Direktori alumni berhasil diambil', ApiResponse::paginationMeta($this->emptyPage($perPage)));
        }

        $blockedUserIds = $this->blockedUserIds($user->id);

        $alumni = Alumni::query()
            ->with('department:id,name', 'graduationYear:id,year', 'user:id,name,avatar_path')
            ->where('institution_id', $institutionId)
            ->whereNotNull('user_id')
            ->where('user_id', '!=', $user->id)
            ->when($blockedUserIds->isNotEmpty(), fn ($query) => $query->whereNotIn('user_id', $blockedUserIds))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%")
                        ->orWhere('position', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate($perPage);

        $connections = $this->connectionsWith($user->id, collect($alumni->items())->pluck('user_id'));

        $data = collect($alumni->items())->map(function (Alumni $alumnus) use ($user, $connections) {
            return new NetworkingAlumniResource($alumnus, $this->statusFor($connections->get($alumnus->user_id), $user->id));
        });

        return ApiResponse::success($data, 'Direktori alumni berhasil diambil', ApiResponse::paginationMeta($alumni));
    }

    /**
     * Single alumni profile within the directory (same institution, not
     * blocked, with a linked account) plus the viewer's connection status.
     */
    public function show(Alumni $alumnus, Request $request): JsonResponse
    {
        $this->authorize('viewAny', Connection::class);

        /** @var User $user */
        $user = $request->user();

        if (! $alumnus->user_id || $alumnus->institution_id !== $user->institution_id || $this->isBlocked($user->id, $alumnus->user_id)) {
            return ApiResponse::error('Profil alumni tidak ditemukan', [], 404);
        }

        $alumnus->load('department:id,name', 'graduationYear:id,year', 'user:id,name,avatar_path');

        $connection = Connection::between($user->id, $alumnus->user_id)->first();

        return ApiResponse::success(
            new NetworkingAlumniResource($alumnus, $this->statusFor($connection, $user->id)),
            'Profil alumni berhasil diambil'
        );
    }

    /**
     * My confirmed connections (status = connected), both directions.
     */
    public function connections(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Connection::class);

        /** @var User $user */
        $user = $request->user();

        $connections = Connection::query()
            ->with('requester.alumni.department:id,name', 'requester.alumni.graduationYear:id,year', 'receiver.alumni.department:id,name', 'receiver.alumni.graduationYear:id,year')
            ->where('status', 'connected')
            ->where(fn ($query) => $query->where('requester_id', $user->id)->orWhere('receiver_id', $user->id))
            ->orderByDesc('updated_at')
            ->get();

        $data = $connections->map(fn (Connection $connection) => new ConnectionResource($connection, $user->id));

        return ApiResponse::success($data, 'Daftar koneksi berhasil diambil');
    }

    /**
     * Incoming pending requests (I am the receiver).
     */
    public function requests(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Connection::class);

        /** @var User $user */
        $user = $request->user();

        $requests = Connection::query()
            ->with('requester.alumni.department:id,name', 'requester.alumni.graduationYear:id,year')
            ->where('receiver_id', $user->id)
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->get();

        $data = $requests->map(fn (Connection $connection) => new ConnectionResource($connection, $user->id));

        return ApiResponse::success($data, 'Daftar permintaan koneksi berhasil diambil');
    }

    /**
     * Send a connection request. Backend-enforced rules:
     * - cannot request yourself
     * - receiver must be an alumni of the same institution with an account
     * - no existing connection/request in either direction
     * - neither side may have blocked the other
     */
    public function store(StoreConnectionRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $receiver = User::query()->with('alumni:id,user_id,institution_id')->find($request->receiver_id);

        if (! $receiver) {
            return ApiResponse::error('Alumni tujuan tidak ditemukan', [], 422);
        }

        if ($receiver->id === $user->id) {
            return ApiResponse::error('Tidak dapat mengirim permintaan ke diri sendiri', [], 422);
        }

        $receiverAlumni = Alumni::query()
            ->where('user_id', $receiver->id)
            ->where('institution_id', $user->institution_id)
            ->first();

        if (! $receiverAlumni) {
            return ApiResponse::error('Alumni tujuan bukan alumni di institusi Anda', [], 422);
        }

        if ($this->isBlocked($user->id, $receiver->id)) {
            return ApiResponse::error('Tidak dapat mengirim permintaan koneksi ke pengguna ini', [], 422);
        }

        if (Connection::between($user->id, $receiver->id)->exists()) {
            return ApiResponse::error('Permintaan koneksi sudah ada', [], 422);
        }

        $connection = Connection::create([
            'requester_id' => $user->id,
            'receiver_id' => $receiver->id,
            'status' => 'pending',
        ]);

        $connection->load('receiver.alumni.department:id,name', 'receiver.alumni.graduationYear:id,year');

        NotificationService::notifyUser(
            $receiver,
            'Permintaan koneksi',
            $user->name.' ingin terhubung dengan Anda',
            '/jejaring',
            'connection'
        );

        return ApiResponse::success(new ConnectionResource($connection, $user->id), 'Permintaan koneksi terkirim', [], 201);
    }

    /**
     * Accept an incoming request (receiver only, pending only).
     */
    public function accept(Connection $connection, Request $request): JsonResponse
    {
        $this->authorize('update', $connection);

        /** @var User $user */
        $user = $request->user();

        $connection->load('requester.alumni.department:id,name', 'requester.alumni.graduationYear:id,year');

        $connection->update([
            'status' => 'connected',
            'action_user_id' => $user->id,
        ]);

        $requester = $connection->requester;
        if ($requester) {
            NotificationService::notifyUser(
                $requester,
                'Koneksi diterima',
                $user->name.' menerima permintaan koneksi Anda',
                '/jejaring',
                'connection'
            );
        }

        $connection->load('requester.alumni.department:id,name', 'requester.alumni.graduationYear:id,year');

        return ApiResponse::success(new ConnectionResource($connection, $user->id), 'Koneksi berhasil dibuat');
    }

    /**
     * Reject an incoming request (receiver only, pending only).
     */
    public function reject(Connection $connection, Request $request): JsonResponse
    {
        $this->authorize('update', $connection);

        $connection->delete();

        return ApiResponse::success([], 'Permintaan koneksi ditolak');
    }

    /**
     * Cancel a pending request (requester) or remove a confirmed connection
     * (either party).
     */
    public function destroy(Connection $connection): JsonResponse
    {
        $this->authorize('delete', $connection);

        $connection->delete();

        return ApiResponse::success([], 'Koneksi berhasil dihapus');
    }

    /**
     * Block a user: records the block and removes any existing connection.
     * The blocked user disappears from the directory on both sides.
     */
    public function block(BlockUserRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($request->blocked_id === $user->id) {
            return ApiResponse::error('Tidak dapat memblokir diri sendiri', [], 422);
        }

        BlockedUser::firstOrCreate([
            'blocker_id' => $user->id,
            'blocked_id' => $request->blocked_id,
        ]);

        Connection::between($user->id, $request->blocked_id)->delete();

        return ApiResponse::success([], 'Pengguna berhasil diblokir');
    }

    /**
     * Users I have blocked (only my own blocks are listed).
     */
    public function blocked(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Connection::class);

        /** @var User $user */
        $user = $request->user();

        $blocks = BlockedUser::query()
            ->with('blocked:id,name,avatar_path')
            ->where('blocker_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        $data = $blocks->map(fn (BlockedUser $block) => [
            'id' => $block->id,
            'created_at' => $block->created_at,
            'user' => $block->blocked ? [
                'id' => $block->blocked->id,
                'name' => $block->blocked->name,
                'avatar_url' => $block->blocked->avatar_path ? url('storage/'.$block->blocked->avatar_path) : null,
            ] : null,
        ])->values();

        return ApiResponse::success($data, 'Daftar pengguna yang diblokir berhasil diambil');
    }

    /**
     * Unblock a user I previously blocked.
     */
    public function unblock(BlockedUser $blockedUser): JsonResponse
    {
        $this->authorize('delete', $blockedUser);

        $blockedUser->delete();

        return ApiResponse::success([], 'Pengguna berhasil dibuka blokirnya');
    }

    /**
     * Report a user to the institution/platform for review.
     */
    public function report(ReportUserRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($request->reported_id === $user->id) {
            return ApiResponse::error('Tidak dapat melaporkan diri sendiri', [], 422);
        }

        Report::create([
            'reporter_id' => $user->id,
            'reported_id' => $request->reported_id,
            'reason' => $request->reason,
            'details' => $request->details,
            'status' => 'pending',
        ]);

        return ApiResponse::success([], 'Laporan berhasil dikirim', [], 201);
    }

    /**
     * User ids blocked by or blocking the given user (union of both sides).
     *
     * @return Collection<int, string>
     */
    private function blockedUserIds(string $userId): Collection
    {
        return BlockedUser::query()
            ->where('blocker_id', $userId)
            ->orWhere('blocked_id', $userId)
            ->get()
            ->flatMap(fn (BlockedUser $block) => [$block->blocker_id, $block->blocked_id])
            ->unique()
            ->values();
    }

    private function emptyPage(int $perPage): LengthAwarePaginator
    {
        return new LengthAwarePaginator([], 0, $perPage, 1, ['path' => url('/api/v1/networking/alumni')]);
    }

    private function isBlocked(string $firstUserId, string $secondUserId): bool
    {
        return BlockedUser::query()
            ->where(fn ($query) => $query
                ->where('blocker_id', $firstUserId)->where('blocked_id', $secondUserId)
                ->orWhere('blocker_id', $secondUserId)->where('blocked_id', $firstUserId))
            ->exists();
    }

    /**
     * All connections between the viewer and a set of target user ids,
     * keyed by the target user id.
     *
     * @param  Collection<int, string|null>  $targetUserIds
     * @return Collection<string, Connection>
     */
    private function connectionsWith(string $viewerId, Collection $targetUserIds): Collection
    {
        $ids = $targetUserIds->filter()->values();

        if ($ids->isEmpty()) {
            return collect();
        }

        return Connection::query()
            ->where(function ($query) use ($viewerId, $ids) {
                $query->whereIn('requester_id', $ids)->where('receiver_id', $viewerId)
                    ->orWhere('requester_id', $viewerId)->whereIn('receiver_id', $ids);
            })
            ->get()
            ->keyBy(fn (Connection $connection) => $connection->requester_id === $viewerId ? $connection->receiver_id : $connection->requester_id);
    }

    /**
     * Connection status relative to the viewer.
     *
     * @return array{status: string, connection_id: string|null}
     */
    private function statusFor(?Connection $connection, string $viewerId): array
    {
        if (! $connection) {
            return ['status' => 'none', 'connection_id' => null];
        }

        if ($connection->status === 'connected') {
            return ['status' => 'connected', 'connection_id' => $connection->id];
        }

        return $connection->requester_id === $viewerId
            ? ['status' => 'pending_outgoing', 'connection_id' => $connection->id]
            : ['status' => 'pending_incoming', 'connection_id' => $connection->id];
    }
}
