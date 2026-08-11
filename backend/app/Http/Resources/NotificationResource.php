<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = $this->data ?? [];

        return [
            'id' => $this->id,
            'title' => $data['title'] ?? 'Notifikasi',
            'body' => $data['body'] ?? '',
            'url' => $data['url'] ?? null,
            'kind' => $data['kind'] ?? 'info',
            'read_at' => $this->read_at,
            'created_at' => $this->created_at,
        ];
    }
}
