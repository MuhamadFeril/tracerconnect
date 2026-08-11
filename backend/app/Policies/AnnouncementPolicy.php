<?php

namespace App\Policies;

use App\Models\Announcement;
use App\Models\User;

class AnnouncementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('announcement.view');
    }

    public function view(User $user, Announcement $announcement): bool
    {
        return $user->can('announcement.view')
            && ($user->hasRole('super_admin') || $user->institution_id === $announcement->institution_id);
    }

    public function create(User $user): bool
    {
        return $user->can('announcement.create');
    }

    public function update(User $user, Announcement $announcement): bool
    {
        return $user->can('announcement.update')
            && ($user->hasRole('super_admin') || $user->institution_id === $announcement->institution_id);
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $user->can('announcement.delete')
            && ($user->hasRole('super_admin') || $user->institution_id === $announcement->institution_id);
    }
}
