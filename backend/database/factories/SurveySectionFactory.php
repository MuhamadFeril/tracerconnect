<?php

namespace Database\Factories;

use App\Models\Survey;
use App\Models\SurveySection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SurveySection>
 */
class SurveySectionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'survey_id' => Survey::factory(),
            'title' => fake()->words(3, true),
            'order' => 0,
        ];
    }
}
