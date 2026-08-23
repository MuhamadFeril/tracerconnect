<?php

namespace App\Models;

use Database\Factories\InstitutionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'name',
    'slug',
    'code',
    'email',
    'phone',
    'website',
    'address',
    'logo_path',
    'primary_color',
    'favicon_path',
    'cover_image_path',
    'report_header',
    'report_footer',
    'custom_footer',
    'contact_email',
    'contact_phone',
    'about',
    'description',
    'status',
])]
class Institution extends Model
{
    /** @use HasFactory<InstitutionFactory> */
    use HasFactory, HasUuids, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => 'string',
        ];
    }

    /**
     * Users belonging to this institution.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
