<?php

namespace App\Policies;

use App\Models\Department;
use App\Models\User;

class DepartmentPolicy
{
    private function inSameInstitution(User $user, Department $department): bool
    {
        return $user->institution_id !== null && $user->institution_id === $department->institution_id;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin_institusi');
    }

    public function view(User $user, Department $department): bool
    {
        return $user->hasRole('admin_institusi') && ($user->institution_id === null || $this->inSameInstitution($user, $department));
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin_institusi');
    }

    public function update(User $user, Department $department): bool
    {
        return $user->hasRole('admin_institusi')
            && ($user->institution_id === null || $this->inSameInstitution($user, $department));
    }

    public function delete(User $user, Department $department): bool
    {
        return $this->update($user, $department);
    }
}
