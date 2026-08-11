<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\Survey;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Survey>
 */
class SurveyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => 'draft',
            'version' => 1,
        ];
    }
}
