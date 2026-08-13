<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
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
        $alumni = $this->user()?->alumni;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->user()?->id)],

            // Alumni-editable fields (only persisted when an alumni record is linked).
            // NIS maps to the alumni nis_nim column (same as registration).
            // The uniqueness check is scoped to the linked alumni's institution
            // and only applies when an alumni record actually exists.
            'nis' => [
                'sometimes', 'nullable', 'string', 'max:50',
                Rule::when($alumni !== null, Rule::unique('alumni', 'nis_nim')
                    ->where('institution_id', $alumni?->institution_id)
                    ->ignore($alumni?->id)),
            ],
            'nisn' => ['sometimes', 'nullable', 'string', 'max:50'],
            'socials' => ['sometimes', 'nullable', 'array', 'max:10'],
            'socials.*.platform' => ['required_with:socials', 'string', 'max:50'],
            'socials.*.url' => ['required_with:socials', 'string', 'max:500'],
            'skills' => ['sometimes', 'nullable', 'array', 'max:20'],
            'skills.*' => ['string', 'max:100'],

            // Biodata fields — same rules as the registration form. Empty
            // strings are accepted as an explicit "clear this field" signal
            // (the controller maps them to null before persisting).
            'gender' => [
                'sometimes', 'nullable', 'string',
                Rule::when(
                    fn () => $this->filled('gender') && $this->input('gender') !== '',
                    Rule::in(['male', 'female']),
                ),
            ],
            'phone' => [
                'sometimes', 'nullable', 'string', 'max:50',
                Rule::when(
                    fn () => $this->filled('phone') && $this->input('phone') !== '',
                    ['regex:/^(08|\+62)/', 'min:10'],
                ),
            ],
            'birth_date' => [
                'sometimes', 'nullable',
                Rule::when(
                    fn () => $this->filled('birth_date') && $this->input('birth_date') !== '',
                    'date',
                ),
            ],
            'birthplace' => ['sometimes', 'nullable', 'string', 'max:255'],
            'birthplace_regency' => ['sometimes', 'nullable', 'string', 'max:255'],
            'birthplace_province' => ['sometimes', 'nullable', 'string', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'employment_status' => [
                'sometimes', 'nullable', 'string',
                Rule::when(
                    fn () => $this->filled('employment_status') && $this->input('employment_status') !== '',
                    Rule::in(['working', 'unemployed', 'entrepreneur', 'continuing_study']),
                ),
            ],
        ];
    }
}
