<?php

namespace App\Http\Requests\Event;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('event.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'published'])],
        ];
    }
}
