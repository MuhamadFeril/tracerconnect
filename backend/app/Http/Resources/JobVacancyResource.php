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
        $user = $request->user();

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
            // Employer user id — used by the chat entry point to start a
            // conversation with the job creator.
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Alumni-facing flags (null for staff without an application).
            'bookmarked' => $user ? $this->bookmarks()->where('user_id', $user->id)->exists() : null,
            'has_applied' => $user ? $this->applications()->where('user_id', $user->id)->exists() : null,
            'my_application' => $user ? $this->applications()->where('user_id', $user->id)->value('status') : null,
        ];
    }
}
