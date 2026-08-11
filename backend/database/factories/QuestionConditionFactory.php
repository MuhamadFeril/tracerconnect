<?php

namespace Database\Factories;

use App\Models\Question;
use App\Models\QuestionCondition;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QuestionCondition>
 */
class QuestionConditionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'question_id' => Question::factory(),
            'condition_question_id' => Question::factory(),
            'operator' => 'equals',
            'value' => 'yes',
        ];
    }
}
