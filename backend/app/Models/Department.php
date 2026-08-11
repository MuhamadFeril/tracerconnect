<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\DepartmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['institution_id', 'name', 'code'])]
class Department extends Model
{
    /** @use HasFactory<DepartmentFactory> */
    use BelongsToInstitution, HasFactory, HasUuids, SoftDeletes;

    /**
     * Alumni belonging to this department.
     */
    public function alumni(): HasMany
    {
        return $this->hasMany(Alumni::class);
    }
}
