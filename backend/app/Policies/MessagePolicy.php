<?php

namespace App\Policies;

use App\Models\Message;
use App\Models\User;

class MessagePolicy
{
    /**
     * Only the original sender may delete a message.
     */
    public function delete(User $user, Message $message): bool
    {
        return $user->hasPermissionTo('chat.send')
            && $message->sender_id === $user->id;
    }
}
