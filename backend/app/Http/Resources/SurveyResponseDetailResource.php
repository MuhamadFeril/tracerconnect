<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin view of a single response: respondent info plus every answer
 * paired with its question (label + type).
 */
class SurveyResponseDetailResource extends JsonResource
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
            'status' => $this->status,
            'version' => $this->version,
            'started_at' => $this->started_at,
            'submitted_at' => $this->submitted_at,
            'answers' => $this->answers->map(fn ($answer) => [
                'question_id' => $answer->question_id,
                'question' => $answer->question ? [
                    'id' => $answer->question->id,
                    'label' => $answer->question->label,
                    'type' => $answer->question->type,
                    'section_id' => $answer->question->section_id,
                ] : null,
                'value' => $answer->decoded_value,
            ])->values(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
