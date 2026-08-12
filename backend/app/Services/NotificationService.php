<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\InAppNotification;
use Illuminate\Support\Collection;
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

        self::insertNotifications($userIds, $title, $body, $url, $kind);
    }

    /**
     * Notify the staff (admins/operators/employers) of an institution —
     * e.g. when an alumni submits a job application.
     */
    public static function notifyStaff(
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
            ->role(['institution_admin', 'operator', 'employer'])
            ->pluck('id');

        self::insertNotifications($userIds, $title, $body, $url, $kind);
    }

    /**
     * Bulk-insert one in-app notification per user.
     *
     * @param  Collection<int, mixed>|iterable  $userIds
     */
    private static function insertNotifications(
        iterable $userIds,
        string $title,
        string $body,
        ?string $url,
        string $kind,
    ): void {
        $userIds = collect($userIds)->filter()->unique();

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
