<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\SuccessStory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SuccessStory>
 */
class SuccessStoryFactory extends Factory
{
    protected $model = SuccessStory::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory(),
            'title' => fake()->sentence(5),
            'category' => fake()->randomElement(SuccessStory::CATEGORIES),
            'content' => fake()->paragraphs(3, true),
            'cover_image_path' => 'stories/cover.jpg',
            'alumni_id' => null,
            'status' => 'published',
            'published_at' => now(),
            'created_by' => null,
        ];
    }
}
