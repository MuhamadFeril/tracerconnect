<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'requester_id',
    'receiver_id',
    'status',
    'action_user_id',
])]
class Connection extends Model
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
            'status' => 'string',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function actionUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'action_user_id');
    }

    /**
     * The connection between two users, regardless of direction.
     */
    public function scopeBetween(Builder $query, string $firstUserId, string $secondUserId): Builder
    {
        return $query->where(function (Builder $q) use ($firstUserId, $secondUserId) {
            $q->where('requester_id', $firstUserId)->where('receiver_id', $secondUserId)
                ->orWhere('requester_id', $secondUserId)->where('receiver_id', $firstUserId);
        });
    }
}
