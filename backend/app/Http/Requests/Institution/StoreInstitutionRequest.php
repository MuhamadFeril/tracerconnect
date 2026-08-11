<?php

namespace App\Http\Requests\Institution;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInstitutionRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'alpha_dash', 'max:255', Rule::unique('institutions', 'slug')],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('institutions', 'code')],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'logo_path' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'string', Rule::in(['active', 'trial', 'suspended'])],
        ];
    }
}
