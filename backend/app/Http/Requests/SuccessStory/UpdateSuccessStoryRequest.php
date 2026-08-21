<?php

namespace App\Http\Requests\SuccessStory;

use App\Models\SuccessStory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSuccessStoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('story.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', Rule::in(SuccessStory::CATEGORIES)],
            'content' => ['sometimes', 'string'],
            'cover_image' => ['sometimes', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'alumni_id' => ['nullable', 'uuid', Rule::exists('alumni', 'id')],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'published'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'cover_image.image' => 'File cover harus berupa gambar',
            'cover_image.mimes' => 'Format cover harus jpg, jpeg, png, atau webp',
            'cover_image.max' => 'Ukuran cover maksimal 2 MB',
        ];
    }
}
