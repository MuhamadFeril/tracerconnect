<?php

namespace App\Models;

use Database\Factories\QuestionConditionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['question_id', 'condition_question_id', 'operator', 'value'])]
class QuestionCondition extends Model
{
    /** @use HasFactory<QuestionConditionFactory> */
    use HasFactory, HasUuids;

    /**
     * The question that is conditionally shown.
     */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * The trigger question whose answer activates this condition.
     */
    public function conditionQuestion(): BelongsTo
    {
        return $this->belongsTo(Question::class, 'condition_question_id');
    }
}
