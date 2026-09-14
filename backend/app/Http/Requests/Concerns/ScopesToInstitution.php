<?php

namespace App\Http\Requests\Concerns;

use App\Models\Institution;
use Illuminate\Validation\Rule;

/**
 * Shared tenant-scoping logic for store requests of institution-scoped
 * resources (phase 10 engagement modules).
 *
 * Non-super-admin users are placed inside their own institution: an omitted
 * institution_id is filled in automatically, while an explicitly submitted
 * foreign one is rejected by the validation rules.
 */
trait ScopesToInstitution
{
    /**
     * Fill the institution_id from the current user when it was omitted.
     */
    protected function scopeToInstitution(): void
    {
        $user = $this->user();

        if (! $user || $this->filled('institution_id')) {
            return;
        }

        // 1-tenant deployment: when exactly one active school exists, everyone
        // (including super admin) is attached to it automatically so resources
        // stay tenant-scoped without asking the user to pick a school.
        $single = Institution::where('status', 'active')->get();
        if ($single->count() === 1) {
            $this->merge(['institution_id' => $single->first()->id]);

            return;
        }

        if ($user->institution_id !== null) {
            $this->merge(['institution_id' => $user->institution_id]);
        }
    }

    /**
     * Validation rules for institution_id: super admin may target any
     * institution; everyone else is locked to their own.
     *
     * @return array<int, mixed>
     */
    protected function institutionIdRules(): array
    {
        $user = $this->user();

        return [
            'required', 'uuid', Rule::exists('institutions', 'id'),
            Rule::when($user->institution_id !== null, Rule::in([$user->institution_id])),
        ];
    }
}
