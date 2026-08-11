<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['province_id', 'code', 'name'])]
class Regency extends Model
{
    /**
     * Province this regency belongs to.
     */
    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }

    /**
     * Districts (kecamatan) belonging to this regency.
     */
    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }
}
