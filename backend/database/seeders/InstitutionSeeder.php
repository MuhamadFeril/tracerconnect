<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Database\Seeder;

class InstitutionSeeder extends Seeder
{
    public function run(): void
    {
        $institution = Institution::updateOrCreate(
            ['slug' => 'smk-negeri-1-tracer'],
            [
                'name' => 'SMK Negeri 1 Tracer',
                'code' => 'SMK01',
                'email' => 'info@smkn1tracer.sch.id',
                'phone' => '(021) 555-0123',
                'address' => 'Jl. Pendidikan No. 1, Jakarta',
                'status' => 'active',
            ]
        );

        $superAdmin = User::updateOrCreate(
            ['email' => 'superadmin@tracerconnect.test'],
            [
                'name' => 'Super Admin',
                'password' => 'password',
                'institution_id' => null,
                'is_active' => true,
            ]
        );

        if (! $superAdmin->hasRole('super_admin')) {
            $superAdmin->assignRole('super_admin');
        }

        $institutionAdmin = User::updateOrCreate(
            ['email' => 'admin@smkn1tracer.sch.id'],
            [
                'name' => 'Admin SMK Negeri 1 Tracer',
                'password' => 'password',
                'institution_id' => $institution->id,
                'is_active' => true,
            ]
        );

        if (! $institutionAdmin->hasRole('institution_admin')) {
            $institutionAdmin->assignRole('institution_admin');
        }
    }
}
