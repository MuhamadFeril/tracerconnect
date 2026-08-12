<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobVacancyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'title' => $this->title,
            'company_name' => $this->company_name,
            'description' => $this->description,
            'location' => $this->location,
            'employment_type' => $this->employment_type,
            'application_link' => $this->application_link,
            'status' => $this->status,
            'posted_at' => $this->posted_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Career center flags. Queries that serve alumni load these via
            // withExists() (1/0); queries that serve staff load the count via
            // withCount(). Defaults keep every other consumer backward compatible.
            'is_saved' => (bool) ($this->is_saved ?? false),
            'has_applied' => (bool) ($this->has_applied ?? false),
            'applications_count' => $this->applications_count ?? null,
        ];
    }
}
