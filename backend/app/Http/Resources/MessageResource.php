<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function __construct($resource, public string $viewerId)
    {
        parent::__construct($resource);
    }

    /**
     * A chat message as seen by $viewerId.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $deleted = $this->deleted_at !== null;

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'type' => $this->type,
            'body' => $deleted ? null : $this->body,
            'attachment' => ($deleted || ! $this->attachment_path) ? null : [
                'name' => $this->attachment_name,
                'mime' => $this->attachment_mime,
                'size' => $this->attachment_size,
                'url' => '/storage/'.$this->attachment_path,
            ],
            'is_deleted' => $deleted,
            'is_mine' => $this->sender_id === $this->viewerId,
            'created_at' => $this->created_at,
        ];
    }
}
