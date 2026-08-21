<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['university_id', 'name'])]
class StudyProgram extends Model
{
    use HasUuids;

    /**
     * The university that offers this study program.
     */
    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }
}
