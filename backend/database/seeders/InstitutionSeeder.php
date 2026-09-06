<?php

namespace Database\Seeders;

use App\Models\Institution;
use App\Models\User;
use Illuminate\Database\Seeder;

class InstitutionSeeder extends Seeder
{
    public function run(): void
    {
        $institution1 = Institution::updateOrCreate(
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

        $institution2 = Institution::updateOrCreate(
            ['slug' => 'smkn-11-malang'],
            [
                'name' => 'SMKN 11 Malang',
                'code' => 'SMK11',
                'email' => 'info@smkn11malang.sch.id',
                'phone' => '(0341) 555-0123',
                'address' => 'Jl. A. Yani No. 1, Malang',
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

        $institutionAdmin1 = User::updateOrCreate(
            ['email' => 'admin@smkn1tracer.sch.id'],
            [
                'name' => 'Admin SMK Negeri 1 Tracer',
                'password' => 'password',
                'institution_id' => $institution1->id,
                'is_active' => true,
            ]
        );

        if (! $institutionAdmin1->hasRole('admin_institusi')) {
            $institutionAdmin1->assignRole('admin_institusi');
        }

        $institutionAdmin2 = User::updateOrCreate(
            ['email' => 'admin@smkn11malang.sch.id'],
            [
                'name' => 'Admin SMKN 11 Malang',
                'password' => 'password',
                'institution_id' => $institution2->id,
                'is_active' => true,
            ]
        );

        if (! $institutionAdmin2->hasRole('admin_institusi')) {
            $institutionAdmin2->assignRole('admin_institusi');
        }
    }
}
