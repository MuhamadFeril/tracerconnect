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
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    public function view(User $user, Alumni $alumni): bool
    {
        return $user->hasRole('super_admin') || $this->inSameInstitution($user, $alumni);
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    public function update(User $user, Alumni $alumni): bool
    {
        return $user->hasRole('super_admin')
            || ($this->inSameInstitution($user, $alumni) && $user->hasAnyRole(['institution_admin']));
    }

    public function delete(User $user, Alumni $alumni): bool
    {
        return $this->update($user, $alumni);
    }

    public function import(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    public function export(User $user): bool
    {
        return $this->viewAny($user);
    }
}
