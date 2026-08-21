<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\JobVacancy;
use App\Models\User;
use Illuminate\Database\Seeder;

class EmployerSeeder extends Seeder
{
    /**
     * Demo employers (users with the `employer` role) plus the job vacancies
     * each of them posted. The vacancies share the company names already used
     * by EngagementSeeder so the career chat entry point (job creator ↔
     * alumni) works with real demo data.
     */
    public function run(): void
    {
        $institution = Institution::where('slug', 'smk-negeri-1-tracer')->first();

        if (! $institution) {
            return;
        }

        $employers = [
            [
                'name' => 'HRD PT Teknologi Nusantara',
                'email' => 'hrd@teknologinusantara.co.id',
                'company' => 'PT Teknologi Nusantara',
                'jobs' => [
                    [
                        'title' => 'Software Engineer',
                        'description' => 'Mengembangkan aplikasi web dan mobile untuk klien korporat.',
                        'location' => 'Jakarta',
                        'employment_type' => 'full_time',
                        'application_link' => 'https://example.com/apply/software-engineer',
                    ],
                    [
                        'title' => 'Mobile Developer (React Native)',
                        'description' => 'Mengembangkan aplikasi mobile lintas platform untuk produk perusahaan.',
                        'location' => 'Jakarta',
                        'employment_type' => 'full_time',
                        'application_link' => 'https://example.com/apply/mobile-developer',
                    ],
                    [
                        'title' => 'Quality Assurance Intern',
                        'description' => 'Magang pengujian aplikasi bersama tim QA, terbuka untuk lulusan baru jurusan RPL.',
                        'location' => 'Jakarta',
                        'employment_type' => 'internship',
                        'application_link' => 'https://example.com/apply/qa-intern',
                    ],
                ],
            ],
            [
                'name' => 'HRD PT Jaringan Prima',
                'email' => 'hrd@jaringanprima.co.id',
                'company' => 'PT Jaringan Prima',
                'jobs' => [
                    [
                        'title' => 'Network Engineer',
                        'description' => 'Mengelola infrastruktur jaringan perusahaan.',
                        'location' => 'Bandung',
                        'employment_type' => 'full_time',
                        'application_link' => 'https://example.com/apply/network-engineer',
                    ],
                    [
                        'title' => 'Teknisi Jaringan (Junior)',
                        'description' => 'Memasang dan memelihara perangkat jaringan di kantor klien.',
                        'location' => 'Bandung',
                        'employment_type' => 'full_time',
                        'application_link' => 'https://example.com/apply/junior-network-tech',
                    ],
                ],
            ],
            [
                'name' => 'Recruiter Studio Kreatif Digital',
                'email' => 'recruiter@studiokreatif.co.id',
                'company' => 'Studio Kreatif Digital',
                'jobs' => [
                    [
                        'title' => 'Desainer Grafis (Magang)',
                        'description' => 'Program magang 6 bulan untuk lulusan baru jurusan Multimedia.',
                        'location' => 'Jakarta',
                        'employment_type' => 'internship',
                        'application_link' => 'https://example.com/apply/designer-intern',
                    ],
                    [
                        'title' => 'Content Creator',
                        'description' => 'Membuat konten visual dan video pendek untuk media sosial klien.',
                        'location' => 'Jakarta',
                        'employment_type' => 'contract',
                        'application_link' => 'https://example.com/apply/content-creator',
                    ],
                ],
            ],
        ];

        foreach ($employers as $row) {
            $user = User::updateOrCreate(
                ['email' => $row['email']],
                [
                    'name' => $row['name'],
                    'password' => 'password',
                    'institution_id' => $institution->id,
                    'is_active' => true,
                ]
            );

            if (! $user->hasRole('employer')) {
                $user->assignRole('employer');
            }

            foreach ($row['jobs'] as $job) {
                // Key on title so re-seeding refreshes the same demo vacancies
                // (including the ones originally created by EngagementSeeder)
                // instead of duplicating them.
                //
                // Employer vacancies are cross-school (institution_id null):
                // they are announced to every school, per the product rule
                // "pengumuman pekerjaan/magang tersebar ke seluruh sekolah".
                JobVacancy::updateOrCreate(
                    ['title' => $job['title']],
                    [
                        'institution_id' => null,
                        'company_name' => $row['company'],
                        'description' => $job['description'],
                        'location' => $job['location'],
                        'employment_type' => $job['employment_type'],
                        'application_link' => $job['application_link'],
                        'status' => 'published',
                        'posted_at' => now(),
                        'created_by' => $user->id,
                    ]
                );
            }
        }
    }
}
