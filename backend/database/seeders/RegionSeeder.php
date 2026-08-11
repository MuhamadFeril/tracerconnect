<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class RegionSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/regions.json');

        if (!File::exists($path)) {
            $this->command->error('File regions.json tidak ditemukan.');
            return;
        }

        $data = json_decode(
            File::get($path),
            true
        );

        if (!is_array($data)) {
            $this->command->error('Format regions.json tidak valid.');
            return;
        }

        // Idempotent: skip when the region tables are already populated so
        // re-running db:seed never hits the unique code constraints.
        if (DB::table('provinces')->exists()) {
            $this->command->info('Data wilayah sudah ada — lewati.');
            return;
        }

        DB::disableQueryLog();

        DB::transaction(function () use ($data) {

            foreach ($data as $provinceData) {

                $provinceId = DB::table('provinces')->insertGetId([
                    'code' => $provinceData['code'],
                    'name' => $provinceData['name'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                foreach ($provinceData['regencies'] ?? [] as $regencyData) {

                    $regencyId = DB::table('regencies')->insertGetId([
                        'province_id' => $provinceId,
                        'code' => $regencyData['code'],
                        'name' => $regencyData['name'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    foreach ($regencyData['districts'] ?? [] as $districtData) {

                        $districtId = DB::table('districts')->insertGetId([
                            'regency_id' => $regencyId,
                            'code' => $districtData['code'],
                            'name' => $districtData['name'],
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        foreach ($districtData['villages'] ?? [] as $villageData) {

                            DB::table('villages')->insert([
                                'district_id' => $districtId,
                                'code' => $villageData['code'],
                                'name' => $villageData['name'],
                                'postal_code' => $villageData['postal_code'] ?? null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }
                }
            }
        });

        $this->command->info('Data wilayah berhasil di-seed.');
    }
}
