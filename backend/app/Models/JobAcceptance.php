<?php

namespace App\Models;

use Database\Factories\JobAcceptanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'job_application_id',
    'job_vacancy_id',
    'alumni_id',
    'position_offered',
    'contract_type',
    'start_date',
    'salary',
    'notes',
    'decided_by',
    'decided_at',
])]
class JobAcceptance extends Model
{
    /** @use HasFactory<JobAcceptanceFactory> */
    use HasFactory, HasUuids;

    /**
     * Contract types offered in an acceptance result.
     */
    public const CONTRACT_TYPES = [
        'permanent',
        'full_time',
        'part_time',
        'contract',
        'internship',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'decided_at' => 'datetime',
        ];
    }

    /**
     * The application this acceptance belongs to.
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class, 'job_application_id');
    }

    /**
     * The vacancy the alumni was accepted into.
     */
    public function vacancy(): BelongsTo
    {
        return $this->belongsTo(JobVacancy::class, 'job_vacancy_id');
    }

    /**
     * The accepted alumni profile.
     */
    public function alumni(): BelongsTo
    {
        return $this->belongsTo(Alumni::class);
    }

    /**
     * The employer/staff user who recorded the result.
     */
    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
