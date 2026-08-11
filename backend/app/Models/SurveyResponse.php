<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\SurveyResponseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'institution_id',
    'survey_id',
    'respondent_id',
    'alumni_id',
    'status',
    'version',
    'started_at',
    'submitted_at',
])]
class SurveyResponse extends Model
{
    /** @use HasFactory<SurveyResponseFactory> */
    use BelongsToInstitution, HasFactory, HasUuids, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'started_at' => 'datetime',
            'submitted_at' => 'datetime',
        ];
    }

    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }

    /**
     * The user who filled the survey.
     */
    public function respondent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'respondent_id');
    }

    /**
     * The alumni record linked to the respondent (if any).
     */
    public function alumni(): BelongsTo
    {
        return $this->belongsTo(Alumni::class);
    }

    /**
     * Answers keyed per question.
     */
    public function answers(): HasMany
    {
        return $this->hasMany(SurveyAnswer::class, 'response_id');
    }

    /**
     * Display status: an in-progress draft on an expired survey is 'expired'.
     */
    public function getEffectiveStatusAttribute(): string
    {
        if ($this->status === 'in_progress' && $this->survey?->expires_at?->isPast()) {
            return 'expired';
        }

        return $this->status;
    }

    /**
     * Completion percentage (0-100). Requires the answers count to be loaded
     * (withCount('answers')) plus a survey_questions_count subquery.
     */
    public function getCompletionAttribute(): ?int
    {
        $total = $this->survey_questions_count ?? null;

        if ($total === null) {
            return null;
        }

        $answered = $this->answers_count ?? $this->answers->count();

        return $total === 0 ? 0 : min(100, (int) round($answered / $total * 100));
    }
}
