<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    /**
     * Only users holding the chat.view permission (alumni, institution
     * staff, hrd, super admins) can list conversations.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('chat.view');
    }

    /**
     * Starting a conversation requires chat.send.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('chat.send');
    }

    /**
     * Only participants may view a conversation.
     */
    public function view(User $user, Conversation $conversation): bool
    {
        return $user->hasPermissionTo('chat.view')
            && $conversation->isParticipant($user->id);
    }

    /**
     * Sending messages and muting/reporting/marking-read require being a
     * participant with chat.send.
     */
    public function update(User $user, Conversation $conversation): bool
    {
        return $user->hasPermissionTo('chat.send')
            && $conversation->isParticipant($user->id);
    }
}
