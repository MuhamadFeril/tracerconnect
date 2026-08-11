<?php

namespace App\Http\Requests\Survey;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSurveyRequest extends FormRequest
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
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', Rule::when($this->filled('starts_at'), 'after_or_equal:starts_at')],
            'institution_id' => ['prohibited'],
        ];
    }
}
