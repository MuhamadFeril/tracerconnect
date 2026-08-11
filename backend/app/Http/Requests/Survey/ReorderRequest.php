<?php

namespace App\Http\Requests\Survey;

use Illuminate\Foundation\Http\FormRequest;

class ReorderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('survey.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'sections' => ['sometimes', 'array'],
            'sections.*.id' => ['required', 'uuid'],
            'sections.*.order' => ['required', 'integer', 'min:0'],
            'questions' => ['sometimes', 'array'],
            'questions.*.id' => ['required', 'uuid'],
            'questions.*.order' => ['required', 'integer', 'min:0'],
        ];
    }
}
