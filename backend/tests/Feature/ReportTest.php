<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Question;
use App\Models\Survey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
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

    private function demoSurvey(): Survey
    {
        return Survey::where('title', 'Tracer Study Lulusan 2025')->firstOrFail();
    }

    public function test_admin_can_fetch_executive_summary(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson('/api/v1/reports/executive-summary')
            ->assertOk()
            ->assertJsonPath('data.institution', 'SMK Negeri 1 Tracer')
            ->assertJsonPath('data.total_alumni', 8)
            ->assertJsonPath('data.total_responses', 2)
            ->assertJsonStructure(['data' => [
                'institution',
                'generated_at',
                'total_alumni',
                'total_respondents',
                'response_rate',
                'employment_rate',
                'total_surveys',
                'total_responses',
                'employment_distribution',
                'alumni_per_year',
                'responses_per_survey',
                'recent_responses',
            ]]);
    }

    public function test_viewer_can_fetch_executive_summary(): void
    {
        $viewer = User::create([
            'name' => 'Viewer Report',
            'email' => 'viewer-report@test.test',
            'password' => 'password',
            'institution_id' => Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail()->id,
            'is_active' => true,
        ]);
        $viewer->assignRole('viewer');

        $this->withToken($viewer->createToken('test-token')->plainTextToken)
            ->getJson('/api/v1/reports/executive-summary')
            ->assertOk();
    }

    public function test_alumni_cannot_access_reports(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->getJson('/api/v1/reports/executive-summary')->assertStatus(403);
        $this->withToken($token)->get('/api/v1/reports/alumni/export/csv')->assertStatus(403);
    }

    public function test_admin_can_download_alumni_csv_export(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->get('/api/v1/reports/alumni/export/csv');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('NIS/NIM,Nama', $content);
        $this->assertStringContainsString('Andi Pratama', $content);
    }

    public function test_admin_can_download_alumni_xlsx_export(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->get('/api/v1/reports/alumni/export/xlsx');

        $response->assertOk()
            ->assertHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );

        $content = $response->streamedContent();
        // XLSX files are ZIP archives; check the magic bytes and a sheet entry.
        $this->assertStringStartsWith('PK', $content);
        $this->assertStringContainsString('xl/worksheets', $content);
    }

    public function test_admin_can_download_survey_results_csv(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->demoSurvey();

        $response = $this->withToken($token)->get("/api/v1/reports/surveys/{$survey->id}/results/export/csv");

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Pertanyaan,Tipe', $content);
        $this->assertStringContainsString('Apakah Anda sudah bekerja?', $content);
    }

    public function test_survey_results_export_is_tenant_scoped(): void
    {
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-report',
            'code' => 'IL04',
            'status' => 'active',
        ]);

        $otherSurvey = Survey::factory()->create([
            'institution_id' => $other->id,
            'status' => 'published',
        ]);

        Question::factory()->create(['survey_id' => $otherSurvey->id, 'label' => 'Nama']);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)
            ->get("/api/v1/reports/surveys/{$otherSurvey->id}/results/export/csv")
            ->assertStatus(403);
    }

    public function test_executive_summary_pdf_download(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->get('/api/v1/reports/executive-summary/pdf');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringStartsWith('%PDF', $response->streamedContent());
    }

    public function test_tracer_report_pdf_download(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($token)->get('/api/v1/reports/tracer/pdf');

        $response->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringStartsWith('%PDF', $response->streamedContent());
    }

    public function test_invalid_export_format_returns_404(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->get('/api/v1/reports/alumni/export/json')->assertStatus(404);
        $this->withToken($token)->get('/api/v1/reports/surveys/x/results/export/xml')->assertStatus(404);
    }
}
