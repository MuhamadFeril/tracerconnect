<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name'])]
class Province extends Model
{
    /**
     * Regencies (kabupaten/kota) belonging to this province.
     */
    public function regencies(): HasMany
    {
        return $this->hasMany(Regency::class);
    }
}
