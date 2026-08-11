<?php

namespace Database\Seeders;

use App\Models\Alumni;
use App\Models\Department;
use App\Models\GraduationYear;
use App\Models\Institution;
use Illuminate\Database\Seeder;

class AlumniSeeder extends Seeder
{
    public function run(): void
    {
        $institution = Institution::where('slug', 'smk-negeri-1-tracer')->first();

        if (! $institution) {
            return;
        }

        $departments = [];
        foreach (['Rekayasa Perangkat Lunak', 'Teknik Komputer dan Jaringan', 'Multimedia'] as $name) {
            $departments[$name] = Department::firstOrCreate(
                ['institution_id' => $institution->id, 'name' => $name]
            );
        }

        $years = [];
        foreach ([2022, 2023, 2024, 2025] as $year) {
            $years[$year] = GraduationYear::firstOrCreate(
                ['institution_id' => $institution->id, 'year' => $year]
            );
        }

        // Some rows carry a full birthplace (district, regency, province) so the
        // demo data shows the composed "Tempat Lahir" label; the rest stay null
        // to exercise the UI fallback ('—').
        $rows = [
            ['nis_nim' => '20221001', 'name' => 'Andi Pratama', 'gender' => 'male', 'email' => 'andi.pratama@example.com', 'department' => 'Rekayasa Perangkat Lunak', 'year' => 2022, 'status' => 'working', 'company' => 'PT Teknologi Nusantara', 'position' => 'Software Engineer', 'location' => 'Jakarta', 'birthplace' => 'Kebayoran Baru', 'birthplace_regency' => 'Kota Jakarta Selatan', 'birthplace_province' => 'DKI Jakarta'],
            ['nis_nim' => '20221002', 'name' => 'Budi Santoso', 'gender' => 'male', 'email' => 'budi.santoso@example.com', 'department' => 'Teknik Komputer dan Jaringan', 'year' => 2022, 'status' => 'working', 'company' => 'PT Jaringan Prima', 'position' => 'Network Engineer', 'location' => 'Bandung', 'birthplace' => 'Coblong', 'birthplace_regency' => 'Kota Bandung', 'birthplace_province' => 'Jawa Barat'],
            ['nis_nim' => '20231003', 'name' => 'Citra Lestari', 'gender' => 'female', 'email' => 'citra.lestari@example.com', 'department' => 'Multimedia', 'year' => 2023, 'status' => 'entrepreneur', 'company' => null, 'position' => null, 'location' => null, 'birthplace' => 'Beji', 'birthplace_regency' => 'Kota Depok', 'birthplace_province' => 'Jawa Barat'],
            ['nis_nim' => '20231004', 'name' => 'Dewi Anggraini', 'gender' => 'female', 'email' => 'dewi.anggraini@example.com', 'department' => 'Rekayasa Perangkat Lunak', 'year' => 2023, 'status' => 'continuing_study', 'company' => null, 'position' => null, 'location' => null, 'birthplace' => 'Tegalsari', 'birthplace_regency' => 'Kota Surabaya', 'birthplace_province' => 'Jawa Timur'],
            ['nis_nim' => '20241005', 'name' => 'Eko Wijaya', 'gender' => 'male', 'email' => 'eko.wijaya@example.com', 'department' => 'Teknik Komputer dan Jaringan', 'year' => 2024, 'status' => 'working', 'company' => 'PT Solusi Data', 'position' => 'IT Support', 'location' => 'Surabaya', 'birthplace' => 'Wonokromo', 'birthplace_regency' => 'Kota Surabaya', 'birthplace_province' => 'Jawa Timur'],
            ['nis_nim' => '20241006', 'name' => 'Fitri Handayani', 'gender' => 'female', 'email' => 'fitri.handayani@example.com', 'department' => 'Multimedia', 'year' => 2024, 'status' => 'unemployed', 'company' => null, 'position' => null, 'location' => null],
            ['nis_nim' => '20251007', 'name' => 'Gilang Ramadhan', 'gender' => 'male', 'email' => 'gilang.ramadhan@example.com', 'department' => 'Rekayasa Perangkat Lunak', 'year' => 2025, 'status' => 'working', 'company' => 'PT Kreatif Digital', 'position' => 'Web Developer', 'location' => 'Jakarta', 'birthplace' => 'Pancoran Mas', 'birthplace_regency' => 'Kota Depok', 'birthplace_province' => 'Jawa Barat'],
            ['nis_nim' => '20251008', 'name' => 'Hana Safitri', 'gender' => 'female', 'email' => 'hana.safitri@example.com', 'department' => 'Multimedia', 'year' => 2025, 'status' => 'continuing_study', 'company' => null, 'position' => null, 'location' => null],
        ];

        foreach ($rows as $row) {
            $department = $departments[$row['department']] ?? null;
            $year = $years[$row['year']] ?? null;

            // updateOrCreate so re-seeding also refreshes existing demo rows
            // with the new birthplace fields (firstOrCreate would skip them).
            Alumni::updateOrCreate(
                ['institution_id' => $institution->id, 'nis_nim' => $row['nis_nim']],
                [
                    'name' => $row['name'],
                    'gender' => $row['gender'],
                    'email' => $row['email'],
                    'department_id' => $department?->id,
                    'graduation_year_id' => $year?->id,
                    'employment_status' => $row['status'],
                    'company_name' => $row['company'],
                    'position' => $row['position'],
                    'location' => $row['location'],
                    'birthplace' => $row['birthplace'] ?? null,
                    'birthplace_regency' => $row['birthplace_regency'] ?? null,
                    'birthplace_province' => $row['birthplace_province'] ?? null,
                ]
            );
        }
    }
}
