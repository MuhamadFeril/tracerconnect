<?php

namespace Database\Factories;

use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Institution>
 */
class InstitutionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(4)),
            'code' => strtoupper(Str::random(6)),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'website' => fake()->url(),
            'address' => fake()->address(),
            'status' => 'active',
        ];
    }
}
