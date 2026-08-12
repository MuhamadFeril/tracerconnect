<?php

namespace App\Http\Requests\JobApplication;

use App\Models\JobApplication;
use App\Models\JobVacancy;
use Illuminate\Foundation\Http\FormRequest;

class ApplyJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        $vacancy = $this->route('jobVacancy');

        // Target JobApplicationPolicy explicitly: the first array element
        // selects the policy class, the vacancy is the policy argument.
        return $vacancy instanceof JobVacancy
            && $this->user()?->can('apply', [JobApplication::class, $vacancy]) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'message' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
