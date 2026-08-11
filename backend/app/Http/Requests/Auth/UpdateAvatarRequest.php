<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Avatar upload rules: safe image formats, max 2 MB.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'avatar.required' => 'Pilih file foto terlebih dahulu',
            'avatar.image' => 'File harus berupa gambar',
            'avatar.mimes' => 'Format foto harus jpg, jpeg, png, atau webp',
            'avatar.max' => 'Ukuran foto maksimal 2 MB',
        ];
    }
}
