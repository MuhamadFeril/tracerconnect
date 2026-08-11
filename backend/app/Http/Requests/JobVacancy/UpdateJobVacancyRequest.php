<?php

namespace App\Http\Requests\JobVacancy;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateJobVacancyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('job.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'company_name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'employment_type' => ['nullable', 'string', Rule::in(['full_time', 'part_time', 'internship', 'contract', 'freelance'])],
            'application_link' => ['nullable', 'url', 'max:500'],
            'status' => ['sometimes', 'string', Rule::in(['draft', 'published', 'closed'])],
            'posted_at' => ['nullable', 'date'],
        ];
    }
}
