<?php

namespace App\Http\Requests\JobApplication;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateJobApplicationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('updateStatus', $this->route('jobApplication')) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // 'pending' is the initial state set when an alumni applies, and
            // 'cancelled' is set by the applicant — staff move through these.
            'status' => ['required', 'string', Rule::in(['reviewed', 'accepted', 'rejected'])],
        ];
    }
}
