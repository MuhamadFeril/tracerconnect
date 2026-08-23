<?php

namespace App\Models;

use Database\Factories\JobApplicationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'job_vacancy_id',
    'user_id',
    'alumni_id',
    'status',
    'cover_letter',
    'cv_data',
    'cv_path',
    'portfolio_path',
    'applied_at',
])]
class JobApplication extends Model
{
    /** @use HasFactory<JobApplicationFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    public const STATUSES = [
        'submitted',
        'reviewing',
        'shortlisted',
        'interview',
        'accepted',
        'rejected',
        'withdrawn',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => 'string',
            'cv_data' => 'array',
            'applied_at' => 'datetime',
        ];
    }

    /**
     * The vacancy this application belongs to.
     */
    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'job_vacancy_id');
    }

    /**
     * The user (alumni account) that applied.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The linked alumni profile (when present).
     */
    public function alumni(): BelongsTo
    {
        return $this->belongsTo(Alumni::class);
    }

    /**
     * The hiring result recorded when the application is accepted.
     */
    public function acceptance(): HasOne
    {
        return $this->hasOne(JobAcceptance::class);
    }
}
