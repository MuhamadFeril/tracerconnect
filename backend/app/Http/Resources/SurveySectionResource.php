<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SurveySectionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'survey_id' => $this->survey_id,
            'title' => $this->title,
            'description' => $this->description,
            'order' => $this->order,
            'questions' => QuestionResource::collection($this->whenLoaded('questions')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
