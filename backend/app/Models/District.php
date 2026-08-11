<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['regency_id', 'code', 'name'])]
class District extends Model
{
    /**
     * Regency (kabupaten/kota) this district belongs to.
     */
    public function regency(): BelongsTo
    {
        return $this->belongsTo(Regency::class);
    }
}
