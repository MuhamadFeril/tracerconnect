<?php

namespace App\Http\Requests\Announcement;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('announcement.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'published'])],
            'published_at' => ['nullable', 'date'],
        ];
    }
}
