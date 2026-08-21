<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreConversationRequest extends FormRequest
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
            'user_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('users', 'id')],
            'job_vacancy_id' => ['sometimes', 'nullable', 'uuid', Rule::exists('job_vacancies', 'id')],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->filled('user_id') && ! $this->filled('job_vacancy_id')) {
                $validator->errors()->add('user_id', 'Pilih pengguna atau lowongan untuk memulai chat.');
            }
        });
    }
}
