<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $request->user()->unreadNotifications->markAsRead();

        return ApiResponse::success([], 'Semua notifikasi ditandai sudah dibaca');
    }
}
