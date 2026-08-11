<?php

namespace App\Http\Requests\Alumni;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAlumniRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('alumni.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $alumnus = $this->route('alumnus');

        return [
            'nis_nim' => ['nullable', 'string', 'max:50', Rule::unique('alumni', 'nis_nim')
                ->where('institution_id', $alumnus->institution_id)
                ->ignore($alumnus->id)],
            'name' => ['sometimes', 'string', 'max:255'],
            'gender' => ['nullable', 'string', Rule::in(['male', 'female'])],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'birthplace' => ['nullable', 'string', 'max:255'],
            'birthplace_regency' => ['nullable', 'string', 'max:255'],
            'birthplace_province' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'department_id' => ['nullable', 'uuid', Rule::exists('departments', 'id')->where('institution_id', $alumnus->institution_id)],
            'graduation_year_id' => ['nullable', 'uuid', Rule::exists('graduation_years', 'id')->where('institution_id', $alumnus->institution_id)],
            'employment_status' => ['nullable', 'string', Rule::in(['working', 'unemployed', 'entrepreneur', 'continuing_study'])],
            'company_name' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'institution_id' => ['prohibited'],
        ];
    }
}
