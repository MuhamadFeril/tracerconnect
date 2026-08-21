<?php

namespace App\Models;

use App\Models\Concerns\BelongsToInstitution;
use Database\Factories\SuccessStoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['institution_id', 'title', 'category', 'content', 'cover_image_path', 'alumni_id', 'status', 'published_at', 'created_by'])]
class SuccessStory extends Model
{
    /** @use HasFactory<SuccessStoryFactory> */
    use BelongsToInstitution, HasFactory, HasUuids, SoftDeletes;

    /**
     * Story categories shown on the news feed.
     */
    public const CATEGORIES = ['career', 'study', 'entrepreneur', 'achievement', 'other'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => 'string',
            'published_at' => 'datetime',
        ];
    }

    /**
     * User who wrote the story.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The alumni the story is about (optional).
     */
    public function alumni(): BelongsTo
    {
        return $this->belongsTo(Alumni::class);
    }
}
