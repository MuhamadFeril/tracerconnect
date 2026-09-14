<?php

namespace App\Http\Requests\User;

use App\Models\Institution;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin_institusi') ?? false;
    }

    /**
     * Institution-scoped admins can only create users inside their own institution.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if (! $user) {
            return;
        }

        // Institution-scoped admin: force into own institution.
        if ($user->institution_id !== null) {
            $this->merge(['institution_id' => $user->institution_id]);

            return;
        }

        // Platform-wide admin: auto-assign institution in 1-tenant mode
        // for tenant-scoped roles (alumni). Admin_institusi and hrd are
        // always explicitly assigned.
        $role = $this->input('role');
        if ($user->institution_id === null && ! $this->filled('institution_id') && ! in_array($role, ['hrd', 'admin_institusi'], true)) {
            $single = Institution::where('status', 'active')->get();
            if ($single->count() === 1) {
                $this->merge(['institution_id' => $single->first()->id]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();

        // Platform-wide admin can assign any role; institution-scoped admin only alumni/hrd.
        $allowedRoles = ($user->institution_id === null)
            ? ['admin_institusi', 'alumni', 'hrd']
            : ['alumni', 'hrd'];

        $institutionIdRules = ['nullable', 'uuid', Rule::exists('institutions', 'id')];

        if ($user->institution_id !== null) {
            // Force the user into the admin's own institution.
            $institutionIdRules = ['required', 'uuid', Rule::in([$user->institution_id])];
        } elseif ($this->input('role') === 'hrd') {
            // HRD accounts are cross-school — not bound to any institution.
            $institutionIdRules = ['nullable'];
        } elseif (Institution::where('status', 'active')->count() > 1) {
            // Multi-tenant: every tenant-scoped account needs an institution.
            $institutionIdRules = ['required', 'uuid', Rule::exists('institutions', 'id')];
        }

        // HRD accounts need a company name.
        $companyRules = $this->input('role') === 'hrd'
            ? ['required', 'string', 'max:255']
            : ['nullable', 'string', 'max:255'];

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', Rule::in($allowedRoles)],
            'institution_id' => $institutionIdRules,
            'company_name' => $companyRules,
        ];
    }
}
