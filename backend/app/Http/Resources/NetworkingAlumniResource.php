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
            'business_field' => $this->business_field,
            'business_start_year' => $this->business_start_year,
            'location' => $this->location,
            'work_province' => $this->work_province,
            'work_city' => $this->work_city,
            'study_institution' => $this->study_institution,
            'study_program' => $this->study_program,
            'study_entry_year' => $this->study_entry_year,
            'business_name' => $this->business_name,
            'business_address' => $this->business_address,
            'business_province' => $this->business_province,
            'business_city' => $this->business_city,
            'connection' => $this->connection,
        ];
    }
}
