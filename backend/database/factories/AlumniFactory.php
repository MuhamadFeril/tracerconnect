<?php

namespace Database\Factories;

use App\Models\Alumni;
use App\Models\Institution;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Alumni>
 */
class AlumniFactory extends Factory
{
    /**
     * Real Indonesian places (district, regency, province) used to give demo
     * alumni a complete "Tempat Lahir" label without a separate region lookup.
     *
     * @var array<int, array{0: string, 1: string, 2: string}>
     */
    private const BIRTHPLACES = [
        ['Kebayoran Baru', 'Kota Jakarta Selatan', 'DKI Jakarta'],
        ['Coblong', 'Kota Bandung', 'Jawa Barat'],
        ['Wonokromo', 'Kota Surabaya', 'Jawa Timur'],
        ['Gamping', 'Kabupaten Sleman', 'DI Yogyakarta'],
        ['Lowokwaru', 'Kota Malang', 'Jawa Timur'],
        ['Pancoran Mas', 'Kota Depok', 'Jawa Barat'],
    ];

    /**
     * Pick a complete birthplace triplet (district, regency, province) — or
     * null — so the three columns always stay consistent with each other.
     *
     * @return array{0: string, 1: string, 2: string}|null
     */
    private function pickBirthplace(): ?array
    {
        // ~30% chance of a birthplace so "sebagian" demo data renders the label.
        return fake()->boolean(30) ? fake()->randomElement(self::BIRTHPLACES) : null;
    }

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $birthplace = $this->pickBirthplace();

        return [
            'institution_id' => Institution::factory(),
            'nis_nim' => fake()->unique()->numerify('#######'),
            'name' => fake()->name(),
            'gender' => fake()->randomElement(['male', 'female']),
            'birth_date' => fake()->dateTimeBetween('-40 years', '-18 years')->format('Y-m-d'),
            'birthplace' => $birthplace[0] ?? null,
            'birthplace_regency' => $birthplace[1] ?? null,
            'birthplace_province' => $birthplace[2] ?? null,
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'address' => fake()->address(),
            'department_id' => null,
            'graduation_year_id' => null,
            'employment_status' => fake()->randomElement(['working', 'unemployed', 'entrepreneur', 'continuing_study']),
            'company_name' => fn (array $attributes) => $attributes['employment_status'] === 'working' ? fake()->company() : null,
            'position' => fn (array $attributes) => $attributes['employment_status'] === 'working' ? fake()->jobTitle() : null,
            'location' => fn (array $attributes) => $attributes['employment_status'] === 'working' ? fake()->city() : null,
        ];
    }

    /**
     * Force a complete birthplace (district, regency, province) on the record
     * so tests and demo data can rely on a non-empty "Tempat Lahir".
     */
    public function withBirthplace(): static
    {
        return $this->state(function () {
            $birthplace = fake()->randomElement(self::BIRTHPLACES);

            return [
                'birthplace' => $birthplace[0],
                'birthplace_regency' => $birthplace[1],
                'birthplace_province' => $birthplace[2],
            ];
        });
    }
}
