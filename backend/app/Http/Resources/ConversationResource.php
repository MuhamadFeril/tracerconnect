<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function __construct($resource, public string $viewerId)
    {
        parent::__construct($resource);
    }

    /**
     * A conversation as seen by $viewerId: the other party is resolved from
     * the participant list and the viewer's own mute state is included.
     *
     * Requires eager-loading 'participants.user', the latest message, and the
     * withCount 'unread_count' aggregate.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $participants = $this->participants ?? collect();
        $other = $participants->first(fn ($participant) => $participant->user_id !== $this->viewerId);
        $me = $participants->first(fn ($participant) => $participant->user_id === $this->viewerId);
        $lastMessage = $this->messages?->first();

        return [
            'id' => $this->id,
            'type' => $this->type,
            'subject' => $this->subject,
            'job_vacancy_id' => $this->job_vacancy_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'last_message_at' => $this->last_message_at,
            'other' => $other?->user ? [
                'id' => $other->user->id,
                'name' => $other->user->name,
                'avatar_url' => $other->user->avatar_path ? url('storage/'.$other->user->avatar_path) : null,
            ] : null,
            'job' => $this->whenLoaded('jobVacancy', fn () => $this->jobVacancy ? [
                'id' => $this->jobVacancy->id,
                'title' => $this->jobVacancy->title,
                'company_name' => $this->jobVacancy->company_name,
            ] : null),
            'last_message' => $lastMessage ? new MessageResource($lastMessage, $this->viewerId) : null,
            'unread_count' => (int) ($this->unread_count ?? 0),
            'muted' => (bool) ($me?->muted_at),
        ];
    }
}
