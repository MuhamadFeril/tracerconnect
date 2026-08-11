<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\JobVacancyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['institution_id', 'title', 'company_name', 'description', 'location', 'employment_type', 'application_link', 'status', 'posted_at', 'created_by'])]
class JobVacancy extends Model
{
    /** @use HasFactory<JobVacancyFactory> */
    use BelongsToInstitution, HasFactory, HasUuids, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'employment_type' => 'string',
            'status' => 'string',
            'posted_at' => 'datetime',
        ];
    }

    /**
     * User who created the vacancy.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
