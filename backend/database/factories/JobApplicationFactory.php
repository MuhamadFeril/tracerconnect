<?php

namespace Database\Factories;

use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobApplication>
 */
class JobApplicationFactory extends Factory
{
    protected $model = JobApplication::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_vacancy_id' => JobVacancy::factory(),
            'user_id' => User::factory(),
            'alumni_id' => null,
            'status' => fake()->randomElement(JobApplication::STATUSES),
            'cover_letter' => fake()->paragraph(),
            'cv_path' => null,
            'portfolio_path' => null,
            'applied_at' => now(),
        ];
    }

    public function alumni(string $alumniId): static
    {
        return $this->state(fn () => ['alumni_id' => $alumniId]);
    }
}
