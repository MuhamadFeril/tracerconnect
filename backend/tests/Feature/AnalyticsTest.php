<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Institution;
use App\Models\Question;
use App\Models\Survey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsTest extends TestCase
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

    public function test_admin_can_fetch_overview(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson('/api/v1/analytics/overview')
            ->assertOk()
            ->assertJsonPath('data.total_alumni', 8)
            ->assertJsonPath('data.total_respondents', 2)
            ->assertJsonPath('data.response_rate', 25)
            ->assertJsonStructure(['data' => [
                'total_alumni',
                'total_respondents',
                'response_rate',
                'employment_distribution' => [['status', 'count']],
                'alumni_per_year' => [['year', 'count']],
                'responses_per_survey',
                'recent_responses',
            ]]);
    }

    public function test_viewer_can_fetch_overview(): void
    {
        $viewer = User::create([
            'name' => 'Viewer Analytics',
            'email' => 'viewer-analytics@test.test',
            'password' => 'password',
            'institution_id' => Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail()->id,
            'is_active' => true,
        ]);
        $viewer->assignRole('viewer');

        $this->withToken($viewer->createToken('test-token')->plainTextToken)
            ->getJson('/api/v1/analytics/overview')
            ->assertOk();
    }

    public function test_alumni_cannot_fetch_overview(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->getJson('/api/v1/analytics/overview')->assertStatus(403);
    }

    public function test_overview_includes_employment_rates(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $data = $this->withToken($token)->getJson('/api/v1/analytics/overview')
            ->assertOk()
            ->json('data');

        // Demo alumni: 4 working, 1 entrepreneur, 2 continuing study, 1 unemployed, 8 total.
        $this->assertEquals(50, $data['employment_rate']);
        $this->assertEquals(12.5, $data['entrepreneurship_rate']);
        $this->assertEquals(25, $data['continuing_study_rate']);
        $this->assertEquals(12.5, $data['unemployed_rate']);
    }

    public function test_overview_supports_department_filter(): void
    {
        $institution = Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail();
        $rpl = Department::where('institution_id', $institution->id)
            ->where('name', 'Rekayasa Perangkat Lunak')
            ->firstOrFail();

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        // RPL alumni: Andi, Dewi (both submitted) and Gilang -> 2 respondents of 3.
        $this->withToken($token)->getJson('/api/v1/analytics/overview?department_id='.$rpl->id)
            ->assertOk()
            ->assertJsonPath('data.total_alumni', 3)
            ->assertJsonPath('data.response_rate', 66.7);
    }

    public function test_employment_returns_cohort_and_department_breakdown(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $data = $this->withToken($token)->getJson('/api/v1/analytics/employment')
            ->assertOk()
            ->json('data');

        $byYear = collect($data['by_year'])->keyBy('year');

        // 2022: Andi + Budi, both working.
        $this->assertSame(2, $byYear[2022]['working']);
        // 2023: Citra entrepreneur + Dewi continuing study.
        $this->assertSame(1, $byYear[2023]['entrepreneur']);
        $this->assertSame(1, $byYear[2023]['continuing_study']);
        // 2024: Eko working + Fitri unemployed.
        $this->assertSame(1, $byYear[2024]['working']);
        $this->assertSame(1, $byYear[2024]['unemployed']);

        $this->assertNotEmpty($data['by_department']);
        $this->assertSame(4, collect($data['by_department'])->sum('working'));
    }

    public function test_survey_results_aggregates_answers(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = Survey::where('title', 'Tracer Study Lulusan 2025')->firstOrFail();

        $data = $this->withToken($token)->getJson("/api/v1/analytics/surveys/{$survey->id}/results")
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $data['total_responses']);

        $working = collect($data['question_stats'])->firstWhere('label', 'Apakah Anda sudah bekerja?');
        $this->assertSame(2, $working['response_count']);
        $this->assertSame(1, collect($working['option_counts'])->firstWhere('label', 'Ya')['count']);
        $this->assertSame(1, collect($working['option_counts'])->firstWhere('label', 'Tidak')['count']);

        $rating = collect($data['question_stats'])->firstWhere('label', 'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)');
        // Andi 5 + Dewi 4 -> 4.5
        $this->assertSame(4.5, $rating['average']);
    }

    public function test_survey_results_are_tenant_scoped(): void
    {
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-analytics2',
            'code' => 'IA02',
            'status' => 'active',
        ]);

        $otherSurvey = Survey::factory()->create([
            'institution_id' => $other->id,
            'status' => 'published',
        ]);

        Question::factory()->create(['survey_id' => $otherSurvey->id, 'label' => 'Nama']);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/analytics/surveys/{$otherSurvey->id}/results")
            ->assertStatus(403);
    }

    public function test_overview_is_tenant_scoped(): void
    {
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-analytics',
            'code' => 'IA01',
            'status' => 'active',
        ]);

        Survey::factory()->create(['institution_id' => $other->id, 'title' => 'Survey Rahasia']);

        $superToken = $this->loginAs('superadmin@tracerconnect.test');

        // Super admin scoped to the other institution sees only its data.
        $this->withToken($superToken)->getJson('/api/v1/analytics/overview?institution_id='.$other->id)
            ->assertOk()
            ->assertJsonPath('data.total_alumni', 0)
            ->assertJsonPath('data.responses_per_survey', []);

        // Institution admin never sees another institution's numbers.
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->getJson('/api/v1/analytics/overview?institution_id='.$other->id)
            ->assertOk()
            ->assertJsonPath('data.total_alumni', 8);
    }
}
