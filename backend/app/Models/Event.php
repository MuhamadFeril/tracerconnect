<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['institution_id', 'title', 'description', 'location', 'starts_at', 'ends_at', 'status', 'created_by'])]
class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use BelongsToInstitution, HasFactory, HasUuids, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'status' => 'string',
        ];
    }

    /**
     * User who created the event.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Registrations for this event.
     */
    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }
}
