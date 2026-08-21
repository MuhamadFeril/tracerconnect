<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'type', 'province', 'city'])]
class University extends Model
{
    use HasUuids;

    /**
     * Study programs (prodi) offered by this university.
     */
    public function studyPrograms(): HasMany
    {
        return $this->hasMany(StudyProgram::class);
    }
}
