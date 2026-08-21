<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['job_vacancy_id', 'user_id'])]
class JobBookmark extends Model
{
    use HasUuids;

    /**
     * The bookmarked vacancy.
     */
    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'job_vacancy_id');
    }

    /**
     * The user who bookmarked the vacancy.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
