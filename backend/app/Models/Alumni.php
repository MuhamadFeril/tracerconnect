<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\AlumniFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'institution_id',
    'user_id',
    'nis_nim',
    'nisn',
    'entry_year',
    'name',
    'gender',
    'birth_date',
    'birthplace',
    'birthplace_regency',
    'birthplace_province',
    'email',
    'phone',
    'address',
    'department_id',
    'graduation_year_id',
    'employment_status',
    'company_name',
    'position',
    'business_field',
    'business_start_year',
    'location',
    'work_province',
    'work_city',
    'study_institution',
    'study_program',
    'study_entry_year',
    'business_name',
    'business_address',
    'business_province',
    'business_city',
    'socials',
    'skills',
])]
class Alumni extends Model
{
    /** @use HasFactory<AlumniFactory> */
    use BelongsToInstitution, HasFactory, HasUuids, SoftDeletes;

    /**
     * 'Alumni' is already plural, so Eloquent must not append an 's'.
     */
    protected $table = 'alumni';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'socials' => 'array',
            'skills' => 'array',
            'business_start_year' => 'integer',
        ];
    }

    /**
     * Optional linked user account (alumni portal, phase 7+).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Readable birthplace label, e.g. "Kota Bandung, Jawa Barat".
     * Falls back to whichever part is present.
     */
    public function getBirthplaceLabelAttribute(): ?string
    {
        if (! $this->birthplace && ! $this->birthplace_regency && ! $this->birthplace_province) {
            return null;
        }

        return trim(implode(', ', array_filter([
            $this->birthplace,
            $this->birthplace_regency,
            $this->birthplace_province,
        ])));
    }

    /**
     * The alumni's department (jurusan).
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * The alumni's graduation year (tahun lulus).
     */
    public function graduationYear(): BelongsTo
    {
        return $this->belongsTo(GraduationYear::class);
    }

    /**
     * Shared search/filter scope used by the list, CSV export, and reports.
     *
     * @param  array<string, mixed>  $filters
     */
    public function scopeFiltered(Builder $query, array $filters): Builder
    {
        $search = trim((string) ($filters['search'] ?? ''));

        return $query
            ->when($search !== '', function ($query) use ($search) {
                $escaped = addcslashes($search, '%_\\');
                $query->where(function ($q) use ($escaped) {
                    $q->where('name', 'like', "%{$escaped}%")
                        ->orWhere('nis_nim', 'like', "%{$escaped}%")
                        ->orWhere('email', 'like', "%{$escaped}%")
                        ->orWhere('company_name', 'like', "%{$escaped}%");
                });
            })
            ->when(! empty($filters['department_id']), fn ($query) => $query->where('department_id', $filters['department_id']))
            ->when(! empty($filters['graduation_year_id']), fn ($query) => $query->where('graduation_year_id', $filters['graduation_year_id']))
            ->when(! empty($filters['employment_status']), fn ($query) => $query->where('employment_status', $filters['employment_status']))
            ->when(! empty($filters['gender']), fn ($query) => $query->where('gender', $filters['gender']));
    }
}
