<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\GraduationYearFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['institution_id', 'year'])]
class GraduationYear extends Model
{
    /** @use HasFactory<GraduationYearFactory> */
    use BelongsToInstitution, HasFactory, HasUuids, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'year' => 'integer',
        ];
    }

    /**
     * Alumni graduating in this year.
     */
    public function alumni(): HasMany
    {
        return $this->hasMany(Alumni::class);
    }
}
