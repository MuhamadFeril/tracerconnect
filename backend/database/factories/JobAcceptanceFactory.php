<?php

namespace Database\Factories;

use App\Models\Alumni;
use App\Models\JobAcceptance;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobAcceptance>
 */
class JobAcceptanceFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_application_id' => JobApplication::factory(),
            'job_vacancy_id' => JobVacancy::factory(),
            'alumni_id' => Alumni::factory(),
            'position_offered' => fake()->jobTitle(),
            'contract_type' => fake()->randomElement(JobAcceptance::CONTRACT_TYPES),
            'start_date' => fake()->date(),
            'salary' => null,
            'notes' => null,
            'decided_at' => now(),
        ];
    }
}
