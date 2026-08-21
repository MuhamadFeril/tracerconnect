<?php

namespace App\Policies;

use App\Models\GraduationYear;
use App\Models\User;

class GraduationYearPolicy
{
    private function inSameInstitution(User $user, GraduationYear $graduationYear): bool
    {
        return $user->institution_id !== null && $user->institution_id === $graduationYear->institution_id;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    public function view(User $user, GraduationYear $graduationYear): bool
    {
        return $user->hasRole('super_admin') || $this->inSameInstitution($user, $graduationYear);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    public function update(User $user, GraduationYear $graduationYear): bool
    {
        return $user->hasRole('super_admin')
            || ($this->inSameInstitution($user, $graduationYear) && $user->hasAnyRole(['institution_admin']));
    }

    public function delete(User $user, GraduationYear $graduationYear): bool
    {
        return $this->update($user, $graduationYear);
    }
}
