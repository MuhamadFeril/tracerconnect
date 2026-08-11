<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SurveyResource extends JsonResource
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
            'description' => $this->description,
            'status' => $this->status,
            'version' => $this->version,
            'starts_at' => $this->starts_at,
            'expires_at' => $this->expires_at,
            'published_at' => $this->published_at,
            'sections_count' => $this->whenCounted('sections'),
            'questions_count' => $this->whenCounted('questions'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
