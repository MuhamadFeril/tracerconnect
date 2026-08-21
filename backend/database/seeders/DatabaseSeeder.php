<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            InstitutionSeeder::class,
            AlumniSeeder::class,
            SurveySeeder::class,
            ResponseSeeder::class,
            EngagementSeeder::class,
            EmployerSeeder::class,
            RegionSeeder::class,
            // UniversitySeeder dijalankan terpisah karena datasetnya besar
            // (5.388 PT + 23.935 prodi): php artisan db:seed --class=UniversitySeeder
        ]);
    }
}
