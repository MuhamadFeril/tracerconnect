<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['super_admin', 'institution_admin']) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $target = $this->route('user');

        $allowedRoles = $user->hasRole('super_admin')
            ? ['super_admin', 'institution_admin', 'operator', 'alumni', 'employer', 'viewer']
            : ['operator', 'alumni', 'employer', 'viewer'];

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target->id)],
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', 'string', Rule::in($allowedRoles)],
            // Moving users between institutions is not allowed in this phase.
            'institution_id' => ['prohibited'],
        ];
    }
}
