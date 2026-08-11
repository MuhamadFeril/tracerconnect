<?php

namespace Database\Factories;

use App\Models\GraduationYear;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GraduationYear>
 */
class GraduationYearFactory extends Factory
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
            'year' => fake()->numberBetween(2015, (int) date('Y')),
        ];
    }
}
