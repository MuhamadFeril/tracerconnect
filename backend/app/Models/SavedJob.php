<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['job_vacancy_id', 'user_id'])]
class SavedJob extends Model
{
    use HasUuids;

    /**
     * The bookmarked vacancy.
     */
    public function jobVacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class);
    }

    /**
     * The user who saved the vacancy.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
