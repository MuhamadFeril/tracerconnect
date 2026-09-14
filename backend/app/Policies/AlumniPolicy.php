<?php

namespace App\Policies;

use App\Models\Alumni;
use App\Models\User;

class AlumniPolicy
{
    private function inSameInstitution(User $user, Alumni $alumni): bool
    {
        return $user->institution_id !== null && $user->institution_id === $alumni->institution_id;
    }

    /**
     * Super admins and institution admins may list alumni.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin_institusi');
    }

    public function view(User $user, Alumni $alumni): bool
    {
        return $user->hasRole('admin_institusi') && ($user->institution_id === null || $this->inSameInstitution($user, $alumni));
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin_institusi');
    }

    public function update(User $user, Alumni $alumni): bool
    {
        return $user->hasRole('admin_institusi')
            && ($user->institution_id === null || $this->inSameInstitution($user, $alumni));
    }

    public function delete(User $user, Alumni $alumni): bool
    {
        return $this->update($user, $alumni);
    }

    public function import(User $user): bool
    {
        return $user->hasRole('admin_institusi');
    }

    public function export(User $user): bool
    {
        return $this->viewAny($user);
    }
}
