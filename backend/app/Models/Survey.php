<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\SurveyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'institution_id',
    'title',
    'description',
    'status',
    'version',
    'starts_at',
    'expires_at',
    'published_at',
    'created_by',
])]
class Survey extends Model
{
    /** @use HasFactory<SurveyFactory> */
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
            'version' => 'integer',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    /**
     * Ordered sections of the survey.
     */
    public function sections(): HasMany
    {
        return $this->hasMany(SurveySection::class)->orderBy('order');
    }

    /**
     * All questions (including those not assigned to a section).
     */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class)->orderBy('order');
    }

    /**
     * User who created the survey.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
