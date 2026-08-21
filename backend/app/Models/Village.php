<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['district_id', 'code', 'name', 'postal_code'])]
class Village extends Model
{
    /**
     * District (kecamatan) this village belongs to.
     */
    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }
}
