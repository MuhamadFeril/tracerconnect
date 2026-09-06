<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FcmToken extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'token', 'platform'];

    /**
     * The user who owns this device token.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
