<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'conversation_id',
    'sender_id',
    'type',
    'body',
    'attachment_path',
    'attachment_name',
    'attachment_mime',
    'attachment_size',
])]
class Message extends Model
{
    use HasUuids, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => 'string',
            'attachment_size' => 'integer',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Whether this message has been read by the given user.
     */
    public function isReadBy(string $userId): bool
    {
        return $this->reads()->where('user_id', $userId)->exists();
    }

    public function reads(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(MessageRead::class);
    }
}
