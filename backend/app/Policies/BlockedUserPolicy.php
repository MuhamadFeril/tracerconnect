<?php

namespace App\Policies;

use App\Models\BlockedUser;
use App\Models\User;

class BlockedUserPolicy
{
    /**
     * A user may unblock someone they blocked themselves. Blocks are
     * unilateral, so only the blocker is authorized to remove them.
     */
    public function delete(User $user, BlockedUser $blockedUser): bool
    {
        return $user->hasPermissionTo('networking.report')
            && $blockedUser->blocker_id === $user->id;
    }
}
