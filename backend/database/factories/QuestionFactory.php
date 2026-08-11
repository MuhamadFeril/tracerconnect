<?php

namespace Database\Factories;

use App\Models\Question;
use App\Models\Survey;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Question>
 */
class QuestionFactory extends Factory
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
            'section_id' => null,
            'type' => 'text',
            'label' => fake()->sentence(),
            'is_required' => false,
            'order' => 0,
        ];
    }
}
