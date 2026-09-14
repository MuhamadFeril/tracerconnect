<?php

namespace App\Policies;

use App\Models\Institution;
use App\Models\User;

class InstitutionPolicy
{
    /**
     * Only platform-wide admin_institusi (no institution bound) can manage institutions.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin_institusi') && $user->institution_id === null;
    }

    public function view(User $user, Institution $institution): bool
    {
        if ($user->hasRole('admin_institusi') && $user->institution_id === null) {
            return true;
        }

        // Institution admins may view their own institution (profile/branding).
        return $user->hasRole('admin_institusi')
            && $user->institution_id !== null
            && $user->institution_id === $institution->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin_institusi') && $user->institution_id === null;
    }

    public function update(User $user, Institution $institution): bool
    {
        if ($user->hasRole('admin_institusi') && $user->institution_id === null) {
            return true;
        }

        return $user->hasRole('admin_institusi')
            && $user->institution_id !== null
            && $user->institution_id === $institution->id;
    }

    public function delete(User $user, Institution $institution): bool
    {
        return $user->hasRole('admin_institusi') && $user->institution_id === null;
    }

    public function restore(User $user, Institution $institution): bool
    {
        return $user->hasRole('admin_institusi') && $user->institution_id === null;
    }

    public function forceDelete(User $user, Institution $institution): bool
    {
        return $user->hasRole('admin_institusi') && $user->institution_id === null;
    }
}
