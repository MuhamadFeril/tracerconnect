<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * In-app (database channel) notification used by the alumni portal.
 * Delivered synchronously — no queue workers required (shared hosting).
 */
class InAppNotification extends Notification
{
    public function __construct(
        public string $title,
        public string $body,
        public ?string $url = null,
        public string $kind = 'info',
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'url' => $this->url,
            'kind' => $this->kind,
        ];
    }
}
