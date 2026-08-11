<?php

namespace App\Models;

use Database\Factories\QuestionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'survey_id',
    'section_id',
    'type',
    'label',
    'help_text',
    'is_required',
    'order',
    'validation_rules',
    'settings',
])]
class Question extends Model
{
    /** @use HasFactory<QuestionFactory> */
    use HasFactory, HasUuids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'order' => 'integer',
            'validation_rules' => 'array',
            'settings' => 'array',
        ];
    }

    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(SurveySection::class);
    }

    /**
     * Ordered answer options (choice-based types).
     */
    public function options(): HasMany
    {
        return $this->hasMany(QuestionOption::class)->orderBy('order');
    }

    /**
     * Conditions that decide whether this question is shown.
     */
    public function conditions(): HasMany
    {
        return $this->hasMany(QuestionCondition::class);
    }

    /**
     * The trigger question referenced by conditions.
     */
    public function conditionQuestion(): BelongsTo
    {
        return $this->belongsTo(Question::class, 'condition_question_id');
    }
}
