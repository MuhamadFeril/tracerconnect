<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['super_admin', 'institution_admin']) ?? false;
    }

    /**
     * Institution admins can only create users inside their own institution.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if ($user && $user->hasRole('institution_admin')) {
            $this->merge(['institution_id' => $user->institution_id]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();

        $allowedRoles = $user->hasRole('super_admin')
            ? ['super_admin', 'institution_admin', 'alumni', 'employer']
            : ['alumni', 'employer'];

        $institutionIdRules = ['nullable', 'uuid', Rule::exists('institutions', 'id')];

        if ($user->hasRole('institution_admin')) {
            // Force the user into the admin's own institution.
            $institutionIdRules = ['required', 'uuid', Rule::in([$user->institution_id])];
        } elseif ($this->input('role') === 'super_admin') {
            // Platform-level accounts do not belong to an institution.
            $institutionIdRules = ['nullable'];
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', Rule::in($allowedRoles)],
            'institution_id' => $institutionIdRules,
        ];
    }
}
