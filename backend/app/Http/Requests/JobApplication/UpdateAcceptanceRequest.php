<?php

namespace App\Http\Requests\JobApplication;

use App\Models\JobAcceptance;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAcceptanceRequest extends FormRequest
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
            'position_offered' => ['nullable', 'string', 'max:255'],
            'contract_type' => ['nullable', 'string', Rule::in(JobAcceptance::CONTRACT_TYPES)],
            'start_date' => ['nullable', 'date'],
            'salary' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
