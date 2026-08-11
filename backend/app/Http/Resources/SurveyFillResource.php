<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Payload used by the respondent while filling a survey: the full survey
 * structure plus the answers saved so far (keyed by question id).
 */
class SurveyFillResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $this->survey->loadMissing([
            'sections.questions.options',
            'sections.questions.conditions',
            'questions',
        ]);

        return [
            'id' => $this->id,
            'survey_id' => $this->survey_id,
            'status' => $this->status,
            'version' => $this->version,
            'started_at' => $this->started_at,
            'submitted_at' => $this->submitted_at,
            'survey' => new SurveyDetailResource($this->survey),
            'answers' => $this->answers->mapWithKeys(
                fn ($answer) => [$answer->question_id => $answer->decoded_value]
            ),
        ];
    }
}
