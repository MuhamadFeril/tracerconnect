<?php

namespace App\Http\Requests\JobVacancy;

use App\Http\Requests\Concerns\ScopesToInstitution;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJobVacancyRequest extends FormRequest
{
    use ScopesToInstitution;

    public function authorize(): bool
    {
        return $this->user()?->can('job.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        // HRDs are platform-level: their vacancies are published across
        // all schools, so they never get scoped into a single institution.
        if (! $this->user()?->hasRole('hrd')) {
            $this->scopeToInstitution();
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isHrd = $this->user()?->hasRole('hrd') ?? false;

        return [
            // HRD vacancies have no institution: they are announced to
            // every school. Everyone else stays tenant-scoped.
            'institution_id' => $isHrd
                ? ['nullable', 'prohibited']
                : $this->institutionIdRules(),
            'title' => ['required', 'string', 'max:255'],
            'company_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'employment_type' => ['nullable', 'string', Rule::in(['full_time', 'part_time', 'internship', 'contract', 'freelance'])],
            'application_link' => ['nullable', 'url', 'max:500'],
            'status' => ['required', 'string', Rule::in(['draft', 'published', 'closed'])],
            'posted_at' => ['nullable', 'date'],
        ];
    }
}
