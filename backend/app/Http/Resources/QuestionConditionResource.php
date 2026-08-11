<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionConditionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'question_id' => $this->question_id,
            'condition_question_id' => $this->condition_question_id,
            'operator' => $this->operator,
            'value' => $this->value,
        ];
    }
}
