<?php

namespace App\Http\Requests\GraduationYear;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGraduationYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('graduation-year.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $graduationYear = $this->route('graduation_year');

        return [
            'year' => ['sometimes', 'integer', 'min:1990', 'max:'.(date('Y') + 10), Rule::unique('graduation_years', 'year')
                ->where('institution_id', $graduationYear->institution_id)
                ->ignore($graduationYear->id)],
            'institution_id' => ['prohibited'],
        ];
    }
}
