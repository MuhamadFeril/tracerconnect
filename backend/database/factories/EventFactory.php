<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    protected $model = Event::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory(),
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'location' => fake()->city(),
            'starts_at' => now()->addDays(7),
            'ends_at' => now()->addDays(7)->addHours(3),
            'status' => 'published',
            'created_by' => null,
        ];
    }
}
