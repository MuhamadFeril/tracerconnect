<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class UniversitySeeder extends Seeder
{
    /**
     * Seed seluruh perguruan tinggi dan program studi di Indonesia.
     *
     * Sumber data: `database/data/perguruan-tinggi.csv` (5.388 PT) dan
     * `database/data/program-studi.csv` (23.935 prodi asli per kampus),
     * dari https://github.com/joearton/perguruan-tinggi (PDDikti).
     *
     * Seeder ini sengaja TIDAK dimasukkan ke DatabaseSeeder karena datasetnya
     * besar (~29 ribu baris) dan hanya dibutuhkan di lingkungan nyata.
     * Jalankan secara eksplisit: `php artisan db:seed --class=UniversitySeeder`.
     */
    public function run(): void
    {
        $universityPath = database_path('data/perguruan-tinggi.csv');
        $programPath = database_path('data/program-studi.csv');

        if (! File::exists($universityPath) || ! File::exists($programPath)) {
            $this->command->error('File CSV perguruan tinggi / program studi tidak ditemukan di database/data/.');
            $this->command->info('Unduh dari https://github.com/joearton/perguruan-tinggi lalu letakkan di database/data/.');
            $this->command->info('  - perguruan-tinggi.csv');
            $this->command->info('  - program-studi.csv');

            return;
        }

        // Data referensi: aman untuk di-reseed penuh (tidak ada FK yang mengarah ke sini).
        DB::table('study_programs')->delete();
        DB::table('universities')->delete();

        DB::disableQueryLog();

        $this->command->info('Membaca perguruan tinggi…');

        // CSV dibaca baris per baris (generator) sehingga memori tidak pernah
        // menampung seluruh dataset (~29 ribu baris) sekaligus — aman untuk
        // lingkungan dengan memory_limit kecil sekalipun.
        DB::transaction(function () use ($universityPath, $programPath) {
            // Perguruan tinggi
            $universityIdByName = [];
            $chunk = [];
            $duplicates = 0;
            $total = 0;
            foreach ($this->parseCsv($universityPath) as $university) {
                $total++;
                $normalized = mb_strtolower(trim($university['Nama']));
                if (isset($universityIdByName[$normalized])) {
                    $duplicates++;

                    continue;
                }

                $id = (string) Str::uuid();
                $universityIdByName[$normalized] = $id;

                $chunk[] = [
                    'id' => $id,
                    'code' => null,
                    'name' => trim($university['Nama']),
                    'type' => null,
                    'province' => null,
                    'city' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (count($chunk) >= 500) {
                    DB::table('universities')->insert($chunk);
                    $chunk = [];
                }
            }
            if ($chunk !== []) {
                DB::table('universities')->insert($chunk);
            }
            $this->command->info("Perguruan tinggi dibaca: {$total} (duplikat dilewati: {$duplicates}).");

            // Program studi — hubungkan ke universitas berdasarkan nama (case-insensitive).
            $prodiChunk = [];
            $matched = 0;
            $skipped = 0;
            foreach ($this->parseCsv($programPath) as $program) {
                $universityId = $universityIdByName[mb_strtolower(trim($program['Nama PT']))] ?? null;
                if ($universityId === null) {
                    $skipped++;

                    continue;
                }
                $matched++;

                $prodiChunk[] = [
                    'id' => (string) Str::uuid(),
                    'university_id' => $universityId,
                    'name' => trim($program['Nama Prodi']),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (count($prodiChunk) >= 1000) {
                    DB::table('study_programs')->insert($prodiChunk);
                    $prodiChunk = [];
                }
            }
            if ($prodiChunk !== []) {
                DB::table('study_programs')->insert($prodiChunk);
            }

            $this->command->info("Program studi terhubung: {$matched} (dilewati: {$skipped}).");
        });

        $this->command->info('Data perguruan tinggi dan program studi berhasil di-seed.');
    }

    /**
     * Baca file CSV sederhana (header di baris pertama, dipisahkan koma,
     * mungkin mengandung kutip ganda) sebagai generator. Baris di-yield satu
     * per satu sehingga seluruh dataset tidak pernah dimuat ke memori
     * sekaligus.
     *
     * @return \Generator<int, array<string, string>>
     */
    private function parseCsv(string $path): \Generator
    {
        $handle = fopen($path, 'r');

        if ($handle === false) {
            return;
        }

        // BOM UTF-8 di awal file (jika ada).
        $headerLine = fgets($handle);
        if (is_string($headerLine) && str_starts_with($headerLine, "\xEF\xBB\xBF")) {
            $headerLine = substr($headerLine, 3);
        }
        $header = is_string($headerLine) ? str_getcsv(trim($headerLine)) : [];

        while (($line = fgets($handle)) !== false) {
            if (trim($line) === '') {
                continue;
            }
            $values = str_getcsv($line);
            $row = [];
            foreach ($header as $i => $column) {
                $row[$column] = $values[$i] ?? '';
            }
            yield $row;
        }

        fclose($handle);
    }
}
