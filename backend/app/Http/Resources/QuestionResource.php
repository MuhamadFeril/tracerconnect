<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'survey_id' => $this->survey_id,
            'section_id' => $this->section_id,
            'type' => $this->type,
            'label' => $this->label,
            'help_text' => $this->help_text,
            'is_required' => $this->is_required,
            'order' => $this->order,
            'validation_rules' => $this->validation_rules,
            'settings' => $this->settings,
            'options' => $this->whenLoaded('options', fn () => QuestionOptionResource::collection($this->options), []),
            'conditions' => $this->whenLoaded('conditions', fn () => QuestionConditionResource::collection($this->conditions), []),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
