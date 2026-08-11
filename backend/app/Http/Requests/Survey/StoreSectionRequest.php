<?php

namespace App\Http\Requests\Survey;

use Illuminate\Foundation\Http\FormRequest;

class StoreSectionRequest extends FormRequest
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
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
