<?php

namespace App\Models\Concerns;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToInstitution
{
    /**
     * The institution (tenant) this record belongs to.
     */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Scope to a single institution (tenant isolation).
     */
    public function scopeForInstitution(Builder $query, ?string $institutionId): Builder
    {
        return $institutionId
            ? $query->where($this->getTable().'.institution_id', $institutionId)
            : $query;
    }

    /**
     * Alumni-facing visibility: published content from one institution only.
     * A user without an institution gets nothing, never everything.
     */
    public function scopeVisibleToAlumni(Builder $query, ?string $institutionId): Builder
    {
        if (! $institutionId) {
            return $query->whereRaw('1 = 0');
        }

        return $query
            ->where($this->getTable().'.institution_id', $institutionId)
            ->where('status', 'published');
    }
}
