<?php

namespace App\Http\Requests\Alumni;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAlumniRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('alumni.create') ?? false;
    }

    /**
     * Institution-scoped users are always placed inside their own institution.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if ($user && ! $user->hasRole('super_admin')) {
            $this->merge(['institution_id' => $user->institution_id]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $institutionId = $this->input('institution_id', $user->institution_id);

        return [
            'institution_id' => [
                'required', 'uuid', Rule::exists('institutions', 'id'),
                Rule::when(! $user->hasRole('super_admin'), Rule::in([$user->institution_id])),
            ],
            'nis_nim' => ['nullable', 'string', 'max:50', Rule::unique('alumni', 'nis_nim')->where('institution_id', $institutionId)],
            'name' => ['required', 'string', 'max:255'],
            'gender' => ['nullable', 'string', Rule::in(['male', 'female'])],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'birthplace' => ['nullable', 'string', 'max:255'],
            'birthplace_regency' => ['nullable', 'string', 'max:255'],
            'birthplace_province' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'min:10', 'max:50'],
            'address' => ['nullable', 'string'],
            'department_id' => ['nullable', 'uuid', Rule::exists('departments', 'id')->where('institution_id', $institutionId)],
            'graduation_year_id' => ['nullable', 'uuid', Rule::exists('graduation_years', 'id')->where('institution_id', $institutionId)],
            'employment_status' => ['nullable', 'string', Rule::in(['working', 'unemployed', 'entrepreneur', 'continuing_study'])],
            'company_name' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'business_field' => ['nullable', 'string', 'max:255'],
            'business_start_year' => ['nullable', 'integer', 'min:1990'],
            'location' => ['nullable', 'string', 'max:255'],
            'work_province' => ['nullable', 'string', 'max:255'],
            'work_city' => ['nullable', 'string', 'max:255'],
            'study_institution' => ['nullable', 'string', 'max:255'],
            'study_program' => ['nullable', 'string', 'max:255'],
            'study_entry_year' => ['nullable', 'integer', 'min:1990'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'business_address' => ['nullable', 'string', 'max:255'],
            'business_province' => ['nullable', 'string', 'max:255'],
            'business_city' => ['nullable', 'string', 'max:255'],
        ];
    }
}
