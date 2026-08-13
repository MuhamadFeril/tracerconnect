<?php

namespace App\Policies;

use App\Models\Connection;
use App\Models\User;

class ConnectionPolicy
{
    /**
     * Networking directory is available to users holding networking.view
     * (alumni role). Super admins hold every permission, so this is safe
     * to check by permission alone.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('networking.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('networking.connect');
    }

    /**
     * Only the receiver may accept or reject a pending request.
     */
    public function update(User $user, Connection $connection): bool
    {
        return $user->hasPermissionTo('networking.connect')
            && $connection->receiver_id === $user->id
            && $connection->status === 'pending';
    }

    /**
     * Either party may cancel a pending request or remove a connection.
     */
    public function delete(User $user, Connection $connection): bool
    {
        return $user->hasPermissionTo('networking.connect')
            && in_array($user->id, [$connection->requester_id, $connection->receiver_id], true);
    }
}
