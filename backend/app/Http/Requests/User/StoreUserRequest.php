<?php

namespace App\Http\Requests\User;

use App\Models\Institution;
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
     * In 1-tenant mode (one active school) the school is attached automatically
     * for super admin too, so the UI does not need an institution picker.
     * HRD accounts are cross-school recruiters — they are never bound to an
     * institution, so they are skipped here as well.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if (! $user) {
            return;
        }

        if ($user->hasRole('institution_admin')) {
            $this->merge(['institution_id' => $user->institution_id]);

            return;
        }

        $role = $this->input('role');
        if ($user->hasRole('super_admin') && ! $this->filled('institution_id') && ! in_array($role, ['super_admin', 'hrd'])) {
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

        $allowedRoles = $user->hasRole('super_admin')
            ? ['super_admin', 'institution_admin', 'alumni', 'hrd']
            : ['alumni', 'hrd'];

        $institutionIdRules = ['nullable', 'uuid', Rule::exists('institutions', 'id')];

        if ($user->hasRole('institution_admin')) {
            // Force the user into the admin's own institution.
            $institutionIdRules = ['required', 'uuid', Rule::in([$user->institution_id])];
        } elseif (in_array($this->input('role'), ['super_admin', 'hrd'])) {
            // Platform-level (super admin) and cross-school HRD accounts are
            // not bound to any institution.
            $institutionIdRules = ['nullable'];
        } elseif (Institution::where('status', 'active')->count() > 1) {
            // Multi-tenant deployment: every tenant-scoped account (institution
            // admin, HRD, alumni) must be attached to an existing institution.
            $institutionIdRules = ['required', 'uuid', Rule::exists('institutions', 'id')];
        }

        // HRD accounts are companies/recruiters — their company (PT) name is
        // required so every vacancy they post carries the correct company.
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
