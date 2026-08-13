<?php

namespace App\Http\Requests\Networking;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('networking.report') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reported_id' => ['required', 'uuid', Rule::exists('users', 'id')],
            'reason' => ['required', 'string', 'max:255'],
            'details' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
