<?php

namespace App\Http\Requests\GraduationYear;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGraduationYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('graduation-year.create') ?? false;
    }

    /**
     * Institution-scoped users are always placed inside their own institution.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if ($user && $user->institution_id !== null) {
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
                Rule::when($user->institution_id !== null, Rule::in([$user->institution_id])),
            ],
            'year' => ['required', 'integer', 'min:1990', 'max:'.(date('Y') + 10), Rule::unique('graduation_years', 'year')->where('institution_id', $institutionId)],
        ];
    }
}
