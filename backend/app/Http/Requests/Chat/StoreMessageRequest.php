<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['text', 'image', 'file'])],
            'body' => ['required_if:type,text', 'nullable', 'string', 'max:5000'],
            // Documents follow the global file policy: max 5 MB, safe formats.
            'attachment' => [
                'required_if:type,image',
                'required_if:type,file',
                'nullable',
                'file',
                'mimetypes:image/jpeg,image/png,image/webp,application/pdf',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:5120',
            ],
        ];
    }
}
