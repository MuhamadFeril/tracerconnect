<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConnectionResource extends JsonResource
{
    public function __construct($resource, public string $viewerId)
    {
        parent::__construct($resource);
    }

    /**
     * A connection/request as seen by $viewerId: the other party is resolved
     * relative to the viewer (requester vs receiver), so both sides share the
     * same endpoint and payload shape.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $connection = $this->resource;
        $isRequester = $connection->requester_id === $this->viewerId;
        $otherUser = $isRequester ? $connection->receiver : $connection->requester;
        $alumni = $otherUser?->alumni;

        return [
            'id' => $connection->id,
            'status' => $connection->status,
            'direction' => $isRequester ? 'outgoing' : 'incoming',
            'created_at' => $connection->created_at,
            'user' => $otherUser ? [
                'id' => $otherUser->id,
                'name' => $otherUser->name,
                'avatar_url' => $otherUser->avatar_path ? url('storage/'.$otherUser->avatar_path) : null,
            ] : null,
            'alumni' => $alumni ? [
                'id' => $alumni->id,
                'department' => $alumni->department?->name,
                'graduation_year' => $alumni->graduationYear?->year,
                'employment_status' => $alumni->employment_status,
                'company_name' => $alumni->company_name,
                'position' => $alumni->position,
                'location' => $alumni->location,
            ] : null,
        ];
    }
}
