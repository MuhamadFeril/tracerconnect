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
            && ($user->hasRole('admin_institusi') && ($user->institution_id === null || $user->institution_id === $announcement->institution_id));
    }

    public function create(User $user): bool
    {
        return $user->can('announcement.create');
    }

    public function update(User $user, Announcement $announcement): bool
    {
        return $user->can('announcement.update')
            && ($user->hasRole('admin_institusi') && ($user->institution_id === null || $user->institution_id === $announcement->institution_id));
    }

    public function delete(User $user, Announcement $announcement): bool
    {
        return $user->can('announcement.delete')
            && ($user->hasRole('admin_institusi') && ($user->institution_id === null || $user->institution_id === $announcement->institution_id));
    }
}
