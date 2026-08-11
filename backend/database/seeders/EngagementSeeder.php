<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Event;
use App\Models\Institution;
use App\Models\JobVacancy;
use Illuminate\Database\Seeder;

class EngagementSeeder extends Seeder
{
    public function run(): void
    {
        $institution = Institution::where('slug', 'smk-negeri-1-tracer')->first();

        if (! $institution) {
            return;
        }

        Announcement::updateOrCreate(
            ['institution_id' => $institution->id, 'title' => 'Pengumuman Tracer Study 2026'],
            [
                'body' => 'Seluruh alumni diharapkan mengisi tracer study 2026 melalui portal alumni sebelum 31 Desember 2026.',
                'status' => 'published',
                'published_at' => now(),
            ]
        );

        Announcement::updateOrCreate(
            ['institution_id' => $institution->id, 'title' => 'Reuni Akbar Alumni'],
            [
                'body' => 'Reuni akbar alumni akan diselenggarakan pada bulan Desember. Pendaftaran dibuka mulai bulan November.',
                'status' => 'published',
                'published_at' => now(),
            ]
        );

        Event::updateOrCreate(
            ['institution_id' => $institution->id, 'title' => 'Career Day 2026'],
            [
                'description' => 'Acara career day dengan puluhan perusahaan mitra untuk membantu alumni mencari pekerjaan.',
                'location' => 'Aula SMK Negeri 1 Tracer',
                'starts_at' => now()->addDays(14),
                'ends_at' => now()->addDays(14)->addHours(6),
                'status' => 'published',
            ]
        );

        Event::updateOrCreate(
            ['institution_id' => $institution->id, 'title' => 'Seminar Kewirausahaan'],
            [
                'description' => 'Seminar membangun usaha bagi alumni yang ingin berwirausaha.',
                'location' => 'Ruang Serbaguna',
                'starts_at' => now()->addDays(30),
                'ends_at' => now()->addDays(30)->addHours(3),
                'status' => 'draft',
            ]
        );

        JobVacancy::updateOrCreate(
            ['institution_id' => $institution->id, 'title' => 'Software Engineer'],
            [
                'company_name' => 'PT Teknologi Nusantara',
                'description' => 'Mengembangkan aplikasi web dan mobile untuk klien korporat.',
                'location' => 'Jakarta',
                'employment_type' => 'full_time',
                'application_link' => 'https://example.com/apply/software-engineer',
                'status' => 'published',
                'posted_at' => now(),
            ]
        );

        JobVacancy::updateOrCreate(
            ['institution_id' => $institution->id, 'title' => 'Network Engineer'],
            [
                'company_name' => 'PT Jaringan Prima',
                'description' => 'Mengelola infrastruktur jaringan perusahaan.',
                'location' => 'Bandung',
                'employment_type' => 'full_time',
                'application_link' => 'https://example.com/apply/network-engineer',
                'status' => 'published',
                'posted_at' => now(),
            ]
        );

        JobVacancy::updateOrCreate(
            ['institution_id' => $institution->id, 'title' => 'Desainer Grafis (Magang)'],
            [
                'company_name' => 'Studio Kreatif Digital',
                'description' => 'Program magang 6 bulan untuk lulusan baru jurusan Multimedia.',
                'location' => 'Jakarta',
                'employment_type' => 'internship',
                'application_link' => 'https://example.com/apply/designer-intern',
                'status' => 'published',
                'posted_at' => now(),
            ]
        );
    }
}
