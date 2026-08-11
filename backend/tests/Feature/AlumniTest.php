<?php

namespace Tests\Feature;

use App\Models\Alumni;
use App\Models\Department;
use App\Models\GraduationYear;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class AlumniTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    private function loginAs(string $email): string
    {
        return User::where('email', $email)->firstOrFail()->createToken('test-token')->plainTextToken;
    }

    private function demoInstitution(): Institution
    {
        return Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail();
    }

    private function demoDepartment(): Department
    {
        return Department::where('name', 'Rekayasa Perangkat Lunak')->firstOrFail();
    }

    private function demoYear(): GraduationYear
    {
        return GraduationYear::where('year', 2024)->firstOrFail();
    }

    public function test_alumni_resource_returns_birthplace_regency_and_province(): void
    {
        $alumni = Alumni::create([
            'institution_id' => $this->demoInstitution()->id,
            'name' => 'Budi Wilayah',
            'birthplace' => 'Cileunyi',
            'birthplace_regency' => 'Kabupaten Bandung',
            'birthplace_province' => 'Jawa Barat',
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)
            ->getJson("/api/v1/alumni/{$alumni->id}")
            ->assertOk()
            ->assertJsonPath('data.birthplace', 'Cileunyi')
            ->assertJsonPath('data.birthplace_regency', 'Kabupaten Bandung')
            ->assertJsonPath('data.birthplace_province', 'Jawa Barat')
            ->assertJsonPath('data.birthplace_label', 'Cileunyi, Kabupaten Bandung, Jawa Barat');
    }

    public function test_store_and_update_alumni_accepts_birthplace_region_fields(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->postJson('/api/v1/alumni', [
            'name' => 'Rina Wilayah',
            'nis_nim' => '20260999',
            'email' => 'rina.wilayah@example.com',
            'birthplace' => 'Cileunyi',
            'birthplace_regency' => 'Kabupaten Bandung',
            'birthplace_province' => 'Jawa Barat',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.birthplace', 'Cileunyi')
            ->assertJsonPath('data.birthplace_regency', 'Kabupaten Bandung')
            ->assertJsonPath('data.birthplace_province', 'Jawa Barat')
            ->assertJsonPath('data.birthplace_label', 'Cileunyi, Kabupaten Bandung, Jawa Barat');

        $alumni = Alumni::where('nis_nim', '20260999')->firstOrFail();

        $this->withToken($token)->putJson("/api/v1/alumni/{$alumni->id}", [
            'birthplace' => 'Baleendah',
            'birthplace_regency' => 'Kabupaten Bandung',
            'birthplace_province' => 'Jawa Barat',
        ])->assertOk()->assertJsonPath('data.birthplace', 'Baleendah');
    }

    public function test_super_admin_can_create_alumni_with_department_and_year(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');

        $response = $this->withToken($token)->postJson('/api/v1/alumni', [
            'institution_id' => $this->demoInstitution()->id,
            'nis_nim' => '20250101',
            'name' => 'Ahmad Subagyo',
            'gender' => 'male',
            'email' => 'ahmad@example.com',
            'department_id' => $this->demoDepartment()->id,
            'graduation_year_id' => $this->demoYear()->id,
            'employment_status' => 'working',
            'company_name' => 'PT Maju',
            'position' => 'Developer',
            'location' => 'Jakarta',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Ahmad Subagyo')
            ->assertJsonPath('data.department', 'Rekayasa Perangkat Lunak')
            ->assertJsonPath('data.graduation_year', 2024)
            ->assertJsonPath('data.employment_status', 'working');

        $this->assertDatabaseHas('alumni', ['nis_nim' => '20250101']);
    }

    public function test_institution_admin_creates_alumni_in_own_institution(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->postJson('/api/v1/alumni', [
            'name' => 'Siti Aminah',
            'nis_nim' => '20250202',
            'email' => 'siti@example.com',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.institution_id', $this->demoInstitution()->id);
    }

    public function test_duplicate_nis_in_same_institution_returns_422(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/alumni', [
            'name' => 'Duplikat',
            'nis_nim' => '20221001',
        ])->assertStatus(422);
    }

    public function test_department_from_other_institution_rejected(): void
    {
        $otherDepartment = Department::create([
            'institution_id' => Institution::factory()->create()->id,
            'name' => 'Jurusan Asing',
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->postJson('/api/v1/alumni', [
            'name' => 'Salah Jurusan',
            'department_id' => $otherDepartment->id,
        ])->assertStatus(422);
    }

    public function test_search_and_filter(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $search = $this->withToken($token)->getJson('/api/v1/alumni?search=Andi')->assertOk();
        $this->assertContains('Andi Pratama', collect($search->json('data'))->pluck('name'));
        $this->assertNotContains('Budi Santoso', collect($search->json('data'))->pluck('name'));

        $filter = $this->withToken($token)->getJson('/api/v1/alumni?employment_status=entrepreneur')->assertOk();
        $names = collect($filter->json('data'))->pluck('name');
        $this->assertContains('Citra Lestari', $names);
        $this->assertNotContains('Andi Pratama', $names);
    }

    public function test_tenant_isolation_cannot_view_other_institution_alumni(): void
    {
        $otherInstitution = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-alumni',
            'code' => 'IL03',
            'status' => 'active',
        ]);

        $otherAlumnus = Alumni::create([
            'institution_id' => $otherInstitution->id,
            'name' => 'Alumni Asing',
        ]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/alumni/{$otherAlumnus->id}")->assertStatus(403);
        $this->withToken($token)->putJson("/api/v1/alumni/{$otherAlumnus->id}", ['name' => 'X'])->assertStatus(403);
        $this->withToken($token)->deleteJson("/api/v1/alumni/{$otherAlumnus->id}")->assertStatus(403);
    }

    public function test_import_csv_imports_valid_rows_and_reports_errors(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $csv = "nis_nim,name,gender,email,jurusan,tahun lulus,status pekerjaan,perusahaan,jabatan,lokasi\n"
            ."20260101,Slamet Riyadi,laki-laki,slamet@example.com,Rekayasa Perangkat Lunak,2026,Bekerja,PT Baru,Karyawan,Jakarta\n"
            ."20260102,Rina Marlina,perempuan,rina@example.com,Multimedia,2026,Wirausaha,,,\n"
            ."20260103,,male,,,,,,,,\n"
            ."20260104,Rudi Hartono,,rudi@example.com,,2026,StatusAneh,,,\n";

        $file = UploadedFile::fake()->createWithContent('alumni.csv', $csv);

        $response = $this->withToken($token)->post('/api/v1/alumni/import', [
            'file' => $file,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.imported', 2)
            ->assertJsonCount(2, 'data.errors');

        $this->assertDatabaseHas('alumni', ['nis_nim' => '20260101']);
        $this->assertDatabaseHas('alumni', ['nis_nim' => '20260102']);
        $this->assertDatabaseHas('departments', ['name' => 'Rekayasa Perangkat Lunak']);
        $this->assertDatabaseHas('graduation_years', ['year' => 2026]);

        // Employment status is mapped from Indonesian to the enum value.
        $this->assertSame('working', Alumni::where('nis_nim', '20260101')->firstOrFail()->employment_status);
        $this->assertSame('entrepreneur', Alumni::where('nis_nim', '20260102')->firstOrFail()->employment_status);
    }

    public function test_import_requires_institution_for_super_admin(): void
    {
        $token = $this->loginAs('superadmin@tracerconnect.test');

        $file = UploadedFile::fake()->createWithContent('alumni.csv', "name\nAndi\n");

        $this->withToken($token)->post('/api/v1/alumni/import', [
            'file' => $file,
        ])->assertStatus(422);
    }

    public function test_export_csv_downloads_data(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->get('/api/v1/alumni/export');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('nis_nim,name,gender', $content);
        $this->assertStringContainsString('Andi Pratama', $content);
    }
}
