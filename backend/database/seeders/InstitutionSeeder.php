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
                'phone' => '(022) 555-0123',
                'address' => 'Jl. Tracer No. 1, Bandung',
                'status' => 'active',
            ]
        );

        $institutionAdmin = User::updateOrCreate(
            ['email' => 'admin@smkn1tracer.sch.id'],
            [
                'name' => 'Admin SMKN 1 Tracer',
                'password' => 'password',
                'institution_id' => $institution->id,
                'is_active' => true,
            ]
        );

        if (! $institutionAdmin->hasRole('admin_institusi')) {
            $institutionAdmin->assignRole('admin_institusi');
        }

        $superAdmin = User::updateOrCreate(
            ['email' => 'superadmin@tracerconnect.test'],
            [
                'name' => 'Super Admin',
                'password' => 'password',
                'institution_id' => null,
                'is_active' => true,
            ]
        );

        if (! $superAdmin->hasRole('admin_institusi')) {
            $superAdmin->assignRole('admin_institusi');
        }
    }
}
