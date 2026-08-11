<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\InAppNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class NotificationService
{
    /**
     * Notify every active alumni user of an institution (used when the
     * institution publishes announcements, events, jobs, or surveys).
     *
     * Rows are inserted in bulk to keep publish requests fast even for
     * institutions with thousands of alumni accounts.
     */
    public static function notifyAlumni(
        ?string $institutionId,
        string $title,
        string $body,
        ?string $url = null,
        string $kind = 'info',
    ): void {
        if (! $institutionId) {
            return;
        }

        $userIds = User::query()
            ->where('institution_id', $institutionId)
            ->where('is_active', true)
            ->role('alumni')
            ->pluck('id');

        if ($userIds->isEmpty()) {
            return;
        }

        $now = now();
        $data = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $url,
            'kind' => $kind,
        ], JSON_UNESCAPED_UNICODE);

        $rows = $userIds->map(fn ($userId) => [
            'id' => (string) Str::uuid(),
            'type' => InAppNotification::class,
            'notifiable_type' => User::class,
            'notifiable_id' => $userId,
            'data' => $data,
            'read_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        DB::table('notifications')->insert($rows);
    }
}
