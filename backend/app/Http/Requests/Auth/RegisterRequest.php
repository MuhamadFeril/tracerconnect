<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
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
        $maxYear = (int) date('Y') + 10;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'institution_id' => [
                'sometimes', 'uuid',
                Rule::exists('institutions', 'id')->where('status', 'active'),
            ],

            // Step 2 — personal / academic info
            'gender' => ['sometimes', 'string', Rule::in(['male', 'female'])],
            'phone' => ['sometimes', 'string', 'regex:/^(08|\+62)/', 'min:10', 'max:50'],
            // NIS & NISN must be exactly 10 characters (NISN standard is 10 digits).
            'nis' => ['sometimes', 'string', 'size:10'],
            'nisn' => ['sometimes', 'string', 'size:10'],
            'entry_year' => ['sometimes', 'integer', 'min:1990', "max:{$maxYear}"],
            'graduation_year' => [
                'sometimes', 'integer', 'min:1990', "max:{$maxYear}", 'gt:entry_year',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($this->filled('entry_year') && (int) $value - (int) $this->input('entry_year') < 3) {
                        $fail('Tahun lulus minimal 3 tahun setelah tahun masuk.');
                    }
                },
            ],
            'birthplace' => ['sometimes', 'string', 'max:255'],
            'birthplace_regency' => ['sometimes', 'string', 'max:255'],
            'birthplace_province' => ['sometimes', 'string', 'max:255'],
            'birth_date' => ['sometimes', 'date'],
            'address' => ['sometimes', 'string', 'max:1000'],
            'department' => ['sometimes', 'string', 'max:255'],
            'socials' => ['sometimes', 'array', 'max:10'],
            'socials.*.platform' => ['required_with:socials', 'string', 'max:50'],
            'socials.*.url' => ['required_with:socials', 'string', 'max:500'],
            'skills' => ['sometimes', 'array', 'max:20'],
            'skills.*' => ['string', 'max:100'],

            // Step 3 — career status
            'employment_status' => ['sometimes', 'string', Rule::in([
                'working', 'unemployed', 'entrepreneur', 'continuing_study', 'active_student',
            ])],
            'company_name' => ['sometimes', 'string', 'max:255'],
            'position' => ['sometimes', 'string', 'max:255'],
            'business_field' => ['sometimes', 'string', 'max:255'],
            'business_start_year' => ['sometimes', 'integer', 'min:1990', "max:{$maxYear}"],
            'work_province' => ['sometimes', 'string', 'max:255'],
            'work_city' => ['sometimes', 'string', 'max:255'],
            'study_institution' => ['sometimes', 'string', 'max:255'],
            'study_program' => ['sometimes', 'string', 'max:255'],
            'study_entry_year' => [
                'sometimes', 'integer', 'min:1990', "max:{$maxYear}",
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($this->filled('graduation_year') && (int) $value < (int) $this->input('graduation_year') + 3) {
                        $fail('Tahun masuk kuliah minimal 3 tahun setelah tahun lulus.');
                    }
                },
            ],
            'business_name' => ['sometimes', 'string', 'max:255'],
            'business_address' => ['sometimes', 'string', 'max:255'],
            'business_province' => ['sometimes', 'string', 'max:255'],
            'business_city' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
