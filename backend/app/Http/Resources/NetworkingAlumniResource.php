<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NetworkingAlumniResource extends JsonResource
{
    /**
     * @param  array{status: string, connection_id: string|null}  $connection
     */
    public function __construct($resource, public array $connection)
    {
        parent::__construct($resource);
    }

    /**
     * An alumni entry in the networking directory, with the connection status
     * relative to the viewer (none / pending_outgoing / pending_incoming /
     * connected). Requires eager-loading 'department', 'graduationYear', and
     * 'user' to avoid lazy N+1 queries.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'avatar_url' => $this->user?->avatar_path ? url('storage/'.$this->user->avatar_path) : null,
            'department' => $this->department?->name,
            'graduation_year' => $this->graduationYear?->year,
            'employment_status' => $this->employment_status,
            'company_name' => $this->company_name,
            'position' => $this->position,
            'location' => $this->location,
            'connection' => $this->connection,
        ];
    }
}
