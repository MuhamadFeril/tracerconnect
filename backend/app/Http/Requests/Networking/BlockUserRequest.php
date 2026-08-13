<?php

namespace App\Http\Requests\Networking;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BlockUserRequest extends FormRequest
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
            'blocked_id' => ['required', 'uuid', Rule::exists('users', 'id')],
        ];
    }
}
