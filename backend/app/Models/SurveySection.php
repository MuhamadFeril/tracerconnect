<?php

namespace App\Models;

use Database\Factories\SurveySectionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['survey_id', 'title', 'description', 'order'])]
class SurveySection extends Model
{
    /** @use HasFactory<SurveySectionFactory> */
    use HasFactory, HasUuids;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'order' => 'integer',
        ];
    }

    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class);
    }

    /**
     * Questions ordered inside this section.
     */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class, 'section_id')->orderBy('order');
    }
}
