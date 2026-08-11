<?php

namespace App\Services;

use App\Models\Alumni;
use App\Models\Department;
use App\Models\GraduationYear;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class AlumniImportService
{
    /**
     * Maximum rows accepted per import to protect shared-hosting memory limits.
     */
    private const MAX_ROWS = 5000;

    private const STATUS_MAP = [
        'working' => 'working',
        'bekerja' => 'working',
        'kerja' => 'working',
        'employed' => 'working',
        'unemployed' => 'unemployed',
        'belum bekerja' => 'unemployed',
        'tidak bekerja' => 'unemployed',
        'pengangguran' => 'unemployed',
        'entrepreneur' => 'entrepreneur',
        'wirausaha' => 'entrepreneur',
        'wiraswasta' => 'entrepreneur',
        'continuing_study' => 'continuing_study',
        'melanjutkan pendidikan' => 'continuing_study',
        'kuliah' => 'continuing_study',
        'studi lanjut' => 'continuing_study',
    ];

    private const GENDER_MAP = [
        'male' => 'male',
        'laki-laki' => 'male',
        'laki' => 'male',
        'pria' => 'male',
        'female' => 'female',
        'perempuan' => 'female',
        'wanita' => 'female',
    ];

    private const HEADER_ALIASES = [
        'nis' => 'nis_nim',
        'nim' => 'nis_nim',
        'nis/nim' => 'nis_nim',
        'nis_nim' => 'nis_nim',
        'nama' => 'name',
        'name' => 'name',
        'nama lengkap' => 'name',
        'jenis kelamin' => 'gender',
        'gender' => 'gender',
        'email' => 'email',
        'telepon' => 'phone',
        'phone' => 'phone',
        'no hp' => 'phone',
        'hp' => 'phone',
        'jurusan' => 'department',
        'department' => 'department',
        'tahun lulus' => 'graduation_year',
        'tahun' => 'graduation_year',
        'status' => 'employment_status',
        'status pekerjaan' => 'employment_status',
        'perusahaan' => 'company_name',
        'company' => 'company_name',
        'nama perusahaan' => 'company_name',
        'jabatan' => 'position',
        'position' => 'position',
        'lokasi' => 'location',
        'lokasi kerja' => 'location',
    ];

    /**
     * Import rows from an uploaded CSV file.
     *
     * @return array{imported: int, errors: array<int, array{row: int, message: string}>}
     */
    public function import(string $institutionId, UploadedFile $file): array
    {
        $rows = $this->parseCsv($file);

        $imported = 0;
        $errors = [];

        foreach ($rows as $index => $row) {
            try {
                $this->createFromRow($institutionId, $row);
                $imported++;
            } catch (ValidationException $e) {
                $errors[] = ['row' => $index + 2, 'message' => $e->errors()['row'][0] ?? 'Data tidak valid'];
            } catch (QueryException) {
                $errors[] = ['row' => $index + 2, 'message' => 'Data duplikat atau tidak valid (mis. NIS/NIM sudah terdaftar)'];
            } catch (\Throwable $e) {
                $errors[] = ['row' => $index + 2, 'message' => 'Data baris tidak valid'];
            }
        }

        return ['imported' => $imported, 'errors' => $errors];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function parseCsv(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            throw ValidationException::withMessages(['file' => 'File tidak dapat dibaca']);
        }

        $rows = [];

        try {
            $header = fgetcsv($handle);

            if ($header === false) {
                throw ValidationException::withMessages(['file' => 'File CSV kosong atau tidak valid']);
            }

            // Strip the UTF-8 BOM that Excel-generated files often start with.
            $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);

            $header = array_map(
                fn ($column) => self::HEADER_ALIASES[strtolower(trim((string) $column))] ?? strtolower(trim((string) $column)),
                $header
            );

            while (($data = fgetcsv($handle)) !== false) {
                // Skip fully empty lines.
                if (count(array_filter($data, fn ($value) => trim((string) $value) !== '')) === 0) {
                    continue;
                }

                // Tolerate rows with fewer/more columns than the header.
                $data = array_pad(array_slice($data, 0, count($header)), count($header), null);

                $rows[] = array_combine($header, $data);
            }
        } finally {
            fclose($handle);
        }

        if ($rows === []) {
            throw ValidationException::withMessages(['file' => 'File CSV tidak berisi data']);
        }

        if (count($rows) > self::MAX_ROWS) {
            throw ValidationException::withMessages(['file' => 'File terlalu besar. Maksimal '.self::MAX_ROWS.' baris data.']);
        }

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function createFromRow(string $institutionId, array $row): void
    {
        $data = $this->normalize($row);

        $validator = Validator::make($data, [
            'name' => ['required', 'string', 'max:255'],
            'nis_nim' => ['nullable', 'string', 'max:50'],
            'gender' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'department' => ['nullable', 'string', 'max:255'],
            'graduation_year' => ['nullable', 'integer', 'min:1990', 'max:'.(date('Y') + 10)],
            'employment_status' => ['nullable', 'string', 'max:50'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            throw ValidationException::withMessages(['row' => $validator->errors()->first()]);
        }

        $validated = $validator->validated();

        if (isset($validated['department']) && $validated['department'] !== '') {
            $department = $this->resolveDepartment($institutionId, $validated['department']);
        }

        if (isset($validated['graduation_year']) && $validated['graduation_year'] !== '') {
            $graduationYear = $this->resolveGraduationYear($institutionId, (int) $validated['graduation_year']);
        }

        Alumni::create([
            'institution_id' => $institutionId,
            'nis_nim' => $validated['nis_nim'] ?? null,
            'name' => $validated['name'],
            'gender' => $validated['gender'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'department_id' => $department->id ?? null,
            'graduation_year_id' => $graduationYear->id ?? null,
            'employment_status' => $validated['employment_status'] ?? null,
            'company_name' => $validated['company_name'] ?? null,
            'position' => $validated['position'] ?? null,
            'location' => $validated['location'] ?? null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function normalize(array $row): array
    {
        $data = [];

        foreach ($row as $key => $value) {
            $data[$key] = is_string($value) ? trim($value) : $value;
        }

        if (isset($data['employment_status']) && $data['employment_status'] !== '') {
            $status = self::STATUS_MAP[strtolower((string) $data['employment_status'])] ?? null;

            if ($status === null) {
                throw ValidationException::withMessages(['row' => "Status pekerjaan '{$data['employment_status']}' tidak dikenal"]);
            }

            $data['employment_status'] = $status;
        } else {
            $data['employment_status'] = null;
        }

        if (isset($data['gender']) && $data['gender'] !== '') {
            $gender = self::GENDER_MAP[strtolower((string) $data['gender'])] ?? null;

            if ($gender === null) {
                throw ValidationException::withMessages(['row' => "Jenis kelamin '{$data['gender']}' tidak dikenal"]);
            }

            $data['gender'] = $gender;
        } else {
            $data['gender'] = null;
        }

        return $data;
    }

    /**
     * Find an existing department by name (case-insensitive) or create it.
     */
    private function resolveDepartment(string $institutionId, string $name): Department
    {
        $department = Department::query()
            ->where('institution_id', $institutionId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();

        return $department ?? Department::create(['institution_id' => $institutionId, 'name' => $name]);
    }

    /**
     * Find an existing graduation year or create it.
     */
    private function resolveGraduationYear(string $institutionId, int $year): GraduationYear
    {
        $graduationYear = GraduationYear::query()
            ->where('institution_id', $institutionId)
            ->where('year', $year)
            ->first();

        return $graduationYear ?? GraduationYear::create(['institution_id' => $institutionId, 'year' => $year]);
    }
}
