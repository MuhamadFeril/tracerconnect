<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;

class EventPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('event.view');
    }

    public function view(User $user, Event $event): bool
    {
        return $user->can('event.view')
            && (
                $user->hasRole('admin_institusi')
                    ? ($user->institution_id === null || $user->institution_id === $event->institution_id)
                    : $user->institution_id === $event->institution_id
            );
    }

    public function create(User $user): bool
    {
        return $user->can('event.create');
    }

    public function update(User $user, Event $event): bool
    {
        return $user->can('event.update')
            && ($user->hasRole('admin_institusi') && ($user->institution_id === null || $user->institution_id === $event->institution_id));
    }

    public function delete(User $user, Event $event): bool
    {
        return $user->can('event.delete')
            && ($user->hasRole('admin_institusi') && ($user->institution_id === null || $user->institution_id === $event->institution_id));
    }
}
