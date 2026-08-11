<?php

namespace App\Http\Requests\Survey;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSurveyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('survey.create') ?? false;
    }

    /**
     * Institution-scoped users always create surveys inside their own institution.
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

        return [
            'institution_id' => [
                'required', 'uuid', Rule::exists('institutions', 'id'),
                Rule::when(! $user->hasRole('super_admin'), Rule::in([$user->institution_id])),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', Rule::when($this->filled('starts_at'), 'after_or_equal:starts_at')],
        ];
    }
}
