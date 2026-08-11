<?php

namespace App\Policies;

use App\Models\Institution;
use App\Models\User;

class InstitutionPolicy
{
    /**
     * Only platform (super admin) users can manage institutions.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole('super_admin');
    }

    public function view(User $user, Institution $institution): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        // Institution admins may view their own institution (profile/branding).
        return $user->hasRole('institution_admin')
            && $user->institution_id !== null
            && $user->institution_id === $institution->id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('super_admin');
    }

    public function update(User $user, Institution $institution): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return $user->hasRole('institution_admin')
            && $user->institution_id !== null
            && $user->institution_id === $institution->id;
    }

    public function delete(User $user, Institution $institution): bool
    {
        return $user->hasRole('super_admin');
    }

    public function restore(User $user, Institution $institution): bool
    {
        return $user->hasRole('super_admin');
    }

    public function forceDelete(User $user, Institution $institution): bool
    {
        return $user->hasRole('super_admin');
    }
}
