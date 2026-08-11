<?php

namespace Database\Factories;

use App\Models\Institution;
use App\Models\JobVacancy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobVacancy>
 */
class JobVacancyFactory extends Factory
{
    protected $model = JobVacancy::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'institution_id' => Institution::factory(),
            'title' => fake()->jobTitle(),
            'company_name' => fake()->company(),
            'description' => fake()->paragraph(),
            'location' => fake()->city(),
            'employment_type' => fake()->randomElement(['full_time', 'part_time', 'internship', 'contract', 'freelance']),
            'application_link' => fake()->url(),
            'status' => 'published',
            'posted_at' => now(),
            'created_by' => null,
        ];
    }
}
