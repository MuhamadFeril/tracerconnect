<?php

namespace App\Http\Requests\SuccessStory;

use App\Http\Requests\Concerns\ScopesToInstitution;
use App\Models\SuccessStory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSuccessStoryRequest extends FormRequest
{
    use ScopesToInstitution;

    public function authorize(): bool
    {
        return $this->user()?->can('story.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->scopeToInstitution();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'institution_id' => $this->institutionIdRules(),
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', Rule::in(SuccessStory::CATEGORIES)],
            'content' => ['required', 'string'],
            'cover_image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'alumni_id' => ['nullable', 'uuid', Rule::exists('alumni', 'id')],
            'status' => ['required', 'string', Rule::in(['draft', 'published'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'cover_image.required' => 'Foto cover wajib diunggah',
            'cover_image.image' => 'File cover harus berupa gambar',
            'cover_image.mimes' => 'Format cover harus jpg, jpeg, png, atau webp',
            'cover_image.max' => 'Ukuran cover maksimal 2 MB',
        ];
    }
}
