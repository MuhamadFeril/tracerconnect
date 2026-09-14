<?php

namespace App\Policies;

use App\Models\SuccessStory;
use App\Models\User;

class SuccessStoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('story.view');
    }

    public function view(User $user, SuccessStory $story): bool
    {
        return $user->can('story.view')
            && ($user->hasRole('admin_institusi') && ($user->institution_id === null || $user->institution_id === $story->institution_id));
    }

    public function create(User $user): bool
    {
        return $user->can('story.create');
    }

    public function update(User $user, SuccessStory $story): bool
    {
        return $user->can('story.update')
            && ($user->hasRole('admin_institusi') && ($user->institution_id === null || $user->institution_id === $story->institution_id));
    }

    public function delete(User $user, SuccessStory $story): bool
    {
        return $user->can('story.delete')
            && ($user->hasRole('admin_institusi') && ($user->institution_id === null || $user->institution_id === $story->institution_id));
    }
}
