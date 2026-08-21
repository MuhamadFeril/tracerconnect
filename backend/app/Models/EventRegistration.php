<?php

namespace App\Models;

use Database\Factories\EventRegistrationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['event_id', 'user_id', 'alumni_id', 'attended', 'registered_at'])]
class EventRegistration extends Model
{
    use HasFactory, HasUuids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attended' => 'boolean',
            'registered_at' => 'datetime',
        ];
    }

    /**
     * The event this registration belongs to.
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * The registering user (alumni account).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The linked alumni profile (when present).
     */
    public function alumni(): BelongsTo
    {
        return $this->belongsTo(Alumni::class);
    }
}
