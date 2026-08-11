<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Super admin and institution admins may list users.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    /**
     * Institution admins can only view users inside their own institution.
     */
    public function view(User $user, User $model): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return $user->hasRole('institution_admin')
            && $user->institution_id !== null
            && $user->institution_id === $model->institution_id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super_admin', 'institution_admin']);
    }

    /**
     * An institution admin may manage any non-admin user inside their own
     * institution. Fellow admins can only be managed by the super admin.
     */
    private function canManage(User $user, User $model): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return $user->hasRole('institution_admin')
            && $user->institution_id !== null
            && $user->institution_id === $model->institution_id
            && ! $model->hasRole('institution_admin');
    }

    public function update(User $user, User $model): bool
    {
        return $this->canManage($user, $model);
    }

    public function delete(User $user, User $model): bool
    {
        // A user cannot delete themselves.
        if ($user->id === $model->id) {
            return false;
        }

        return $this->canManage($user, $model);
    }
}
