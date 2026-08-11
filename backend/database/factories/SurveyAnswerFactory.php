<?php

namespace Database\Factories;

use App\Models\Question;
use App\Models\SurveyAnswer;
use App\Models\SurveyResponse;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SurveyAnswer>
 */
class SurveyAnswerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'response_id' => SurveyResponse::factory(),
            'question_id' => Question::factory(),
            'value' => fake()->sentence(),
        ];
    }
}
