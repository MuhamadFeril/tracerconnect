<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SurveyResponseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'survey' => $this->whenLoaded('survey', fn () => [
                'id' => $this->survey->id,
                'title' => $this->survey->title,
                'version' => $this->survey->version,
                'expires_at' => $this->survey->expires_at,
            ]),
            'respondent' => $this->whenLoaded('respondent', fn () => [
                'id' => $this->respondent->id,
                'name' => $this->respondent->name,
                'email' => $this->respondent->email,
            ]),
            'alumni' => $this->whenLoaded('alumni', fn () => [
                'id' => $this->alumni->id,
                'name' => $this->alumni->name,
                'nis_nim' => $this->alumni->nis_nim,
            ]),
            'status' => $this->effective_status,
            'version' => $this->version,
            'started_at' => $this->started_at,
            'submitted_at' => $this->submitted_at,
            'answers_count' => $this->whenCounted('answers'),
            // Completion percentage injected via a survey_questions_count select.
            'completion' => $this->completion,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
