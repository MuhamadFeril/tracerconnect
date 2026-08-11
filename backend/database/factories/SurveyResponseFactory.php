<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SurveyResponse>
 */
class SurveyResponseFactory extends Factory
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
            'survey_id' => Survey::factory(),
            'respondent_id' => User::factory(),
            'status' => 'in_progress',
            'version' => 1,
            'started_at' => now(),
        ];
    }
}
