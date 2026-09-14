<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * Admin users may list users.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasRole('admin_institusi');
    }

    /**
     * Platform-wide admin can view all; institution-scoped admin only their own.
     */
    public function view(User $user, User $model): bool
    {
        if (! $user->hasRole('admin_institusi')) {
            return false;
        }

        // Platform-wide admin (no institution bound).
        if ($user->institution_id === null) {
            return true;
        }

        return $user->institution_id === $model->institution_id;
    }

    public function create(User $user): bool
    {
        return $user->hasRole('admin_institusi');
    }

    /**
     * Platform-wide admin may manage anyone. Institution-scoped admin may
     * manage non-admin users inside their own institution.
     */
    private function canManage(User $user, User $model): bool
    {
        if (! $user->hasRole('admin_institusi')) {
            return false;
        }

        // Platform-wide admin.
        if ($user->institution_id === null) {
            return true;
        }

        return $user->institution_id === $model->institution_id
            && ! $model->hasRole('admin_institusi');
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
