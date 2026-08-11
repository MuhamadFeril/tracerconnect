<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Department>
 */
class DepartmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'institution_id' => Institution::factory(),
            'name' => Str::title($name),
            'code' => strtoupper(Str::random(4)),
        ];
    }
}
