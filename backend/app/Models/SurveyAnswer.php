<?php

namespace App\Models;

use Database\Factories\SurveyAnswerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['response_id', 'question_id', 'value'])]
class SurveyAnswer extends Model
{
    /** @use HasFactory<SurveyAnswerFactory> */
    use HasFactory, HasUuids;

    public function response(): BelongsTo
    {
        return $this->belongsTo(SurveyResponse::class, 'response_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /**
     * The stored value, decoded when it is JSON (multiple_choice).
     */
    public function getDecodedValueAttribute(): mixed
    {
        $trimmed = trim((string) $this->value);

        if (str_starts_with($trimmed, '[') || str_starts_with($trimmed, '{')) {
            $decoded = json_decode($trimmed, true);

            return json_last_error() === JSON_ERROR_NONE ? $decoded : $this->value;
        }

        return $this->value;
    }
}
