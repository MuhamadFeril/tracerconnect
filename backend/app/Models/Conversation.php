<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'type',
    'subject',
    'job_vacancy_id',
    'created_by',
    'last_message_at',
])]
class Conversation extends Model
{
    use HasUuids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => 'string',
            'last_message_at' => 'datetime',
        ];
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ConversationParticipant::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function jobVacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class);
    }

    /**
     * Whether the given user is a participant of this conversation.
     */
    public function isParticipant(string $userId): bool
    {
        return $this->participants()->where('user_id', $userId)->exists();
    }

    /**
     * Conversations the given user participates in.
     */
    public function scopeForUser(Builder $query, string $userId): Builder
    {
        return $query->whereHas('participants', fn (Builder $q) => $q->where('user_id', $userId));
    }
}
