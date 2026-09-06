<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\FcmToken;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NotificationController extends Controller
{
    /**
     * The authenticated user's notification history (newest first).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $notifications = $request->user()
            ->notifications()
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success(
            NotificationResource::collection($notifications->items()),
            'Notifikasi berhasil diambil',
            ApiResponse::paginationMeta($notifications)
        );
    }

    /**
     * Count of unread notifications for the badge.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return ApiResponse::success(
            ['count' => $request->user()->unreadNotifications()->count()],
            'Jumlah notifikasi belum dibaca berhasil diambil'
        );
    }

    /**
     * Mark a single notification as read.
     */
    public function markRead(Request $request, string $notification): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($notification);

        if ($notification->read_at === null) {
            $notification->markAsRead();
        }

        return ApiResponse::success(
            new NotificationResource($notification->fresh()),
            'Notifikasi ditandai sudah dibaca'
        );
    }

    /**
     * Mark every unread notification as read.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return ApiResponse::success([], 'Semua notifikasi ditandai sudah dibaca');
    }

    /**
     * Register (or refresh) the authenticated user's FCM device token so the
     * backend can deliver push notifications to this device.
     */
    public function storeToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:4096'],
            'platform' => ['nullable', 'string', Rule::in(['android', 'ios', 'web'])],
        ]);

        $user = $request->user();

        // A token always belongs to the newest sign-in that owns it: remove
        // any rows for this token under another account first.
        FcmToken::query()
            ->where('token', $data['token'])
            ->where('user_id', '!=', $user->id)
            ->delete();

        FcmToken::query()->updateOrCreate(
            ['token' => $data['token']],
            ['user_id' => $user->id, 'platform' => $data['platform'] ?? null]
        );

        // Keep the token list bounded (old devices / re-installs accumulate).
        // Primary keys are time-ordered UUIDv7, so id order == registration
        // order even for rows created within the same second.
        $keepIds = FcmToken::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(5)
            ->pluck('id');
        FcmToken::query()
            ->where('user_id', $user->id)
            ->whereNotIn('id', $keepIds)
            ->delete();

        return ApiResponse::success([], 'Token perangkat berhasil didaftarkan');
    }

    /**
     * Remove the authenticated user's FCM device token (logout / sign-out).
     */
    public function deleteToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:4096'],
        ]);

        FcmToken::query()
            ->where('user_id', $request->user()->id)
            ->where('token', $data['token'])
            ->delete();

        return ApiResponse::success([], 'Token perangkat berhasil dihapus');
    }
}
