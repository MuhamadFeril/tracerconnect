<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\AnnouncementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['institution_id', 'title', 'body', 'status', 'published_at', 'created_by'])]
class Announcement extends Model
{
    /** @use HasFactory<AnnouncementFactory> */
    use BelongsToInstitution, HasFactory, HasUuids, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => 'string',
            'published_at' => 'datetime',
        ];
    }

    /**
     * User who created the announcement.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
