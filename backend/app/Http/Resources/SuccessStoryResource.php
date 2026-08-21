<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class SuccessStoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'title' => $this->title,
            'category' => $this->category,
            'category_label' => match ($this->category) {
                'career' => 'Karier',
                'study' => 'Melanjutkan Studi',
                'entrepreneur' => 'Wirausaha',
                'achievement' => 'Prestasi',
                default => 'Lainnya',
            },
            'content' => $this->content,
            'cover_image_url' => $this->cover_image_path ? Storage::disk('public')->url($this->cover_image_path) : null,
            'alumni' => $this->whenLoaded('alumni', fn () => $this->alumni ? [
                'id' => $this->alumni->id,
                'name' => $this->alumni->name,
                'department' => $this->alumni->department?->name,
                'graduation_year' => $this->alumni->graduationYear?->year,
            ] : null),
            'status' => $this->status,
            'published_at' => $this->published_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
