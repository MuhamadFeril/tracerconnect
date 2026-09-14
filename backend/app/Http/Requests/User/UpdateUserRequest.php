<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin_institusi') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $target = $this->route('user');

        // Platform-wide admin can assign any role; institution-scoped admin only alumni/hrd.
        $allowedRoles = ($user->institution_id === null)
            ? ['admin_institusi', 'alumni', 'hrd']
            : ['alumni', 'hrd'];

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($target->id)],
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
            'is_active' => ['sometimes', 'boolean'],
            'role' => ['sometimes', 'string', Rule::in($allowedRoles)],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            // Moving users between institutions is not allowed in this phase.
            'institution_id' => ['prohibited'],
        ];
    }
}
