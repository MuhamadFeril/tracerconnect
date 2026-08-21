<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Survey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SurveyTest extends TestCase
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

    private function createSurvey(string $token, array $overrides = []): array
    {
        return $this->withToken($token)->postJson('/api/v1/surveys', array_merge([
            'title' => 'Survey Tracer 2026',
            'description' => 'Kuesioner lulusan',
        ], $overrides))->assertCreated()->json('data');
    }

    public function test_admin_can_create_survey_as_draft(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $survey = $this->createSurvey($token);

        $this->assertSame('draft', $survey['status']);
        $this->assertSame(1, $survey['version']);
        $this->assertSame($this->demoInstitution()->id, $survey['institution_id']);
    }

    public function test_survey_list_is_tenant_scoped(): void
    {
        $superToken = $this->loginAs('superadmin@tracerconnect.test');
        $otherInstitution = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-survey',
            'code' => 'IL04',
            'status' => 'active',
        ]);

        $this->withToken($superToken)->postJson('/api/v1/surveys', [
            'institution_id' => $otherInstitution->id,
            'title' => 'Survey Rahasia',
        ])->assertCreated();

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($adminToken)->getJson('/api/v1/surveys')->assertOk();

        $titles = collect($response->json('data'))->pluck('title');
        $this->assertNotContains('Survey Rahasia', $titles);
    }

    public function test_tenant_isolation_cannot_view_other_institution_survey(): void
    {
        $other = Survey::factory()->create();

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->getJson("/api/v1/surveys/{$other->id}")->assertStatus(403);
        $this->withToken($token)->putJson("/api/v1/surveys/{$other->id}", ['title' => 'X'])->assertStatus(403);
        $this->withToken($token)->deleteJson("/api/v1/surveys/{$other->id}")->assertStatus(403);
    }

    public function test_publish_requires_at_least_one_question(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/publish")->assertStatus(422);
    }

    public function test_publish_and_unpublish_flow(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Nama lengkap',
            'is_required' => true,
        ])->assertCreated();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.version', 1);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/unpublish")
            ->assertOk()
            ->assertJsonPath('data.status', 'draft');

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/publish")
            ->assertOk()
            ->assertJsonPath('data.version', 2);
    }

    public function test_structural_edit_rejected_after_publish(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $question = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Nama lengkap',
        ])->assertCreated()->json('data');

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/publish")->assertOk();

        $this->withToken($token)->putJson("/api/v1/questions/{$question['id']}", ['label' => 'Baru'])->assertStatus(422);
        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Pertanyaan baru',
        ])->assertStatus(422);

        // Metadata update is still allowed.
        $this->withToken($token)->putJson("/api/v1/surveys/{$survey['id']}", ['title' => 'Judul Baru'])->assertOk();
    }

    public function test_alumni_cannot_create_survey(): void
    {
        $alumni = User::create([
            'name' => 'Alumni Survey',
            'email' => 'alumni-survey@test.test',
            'password' => 'password',
            'institution_id' => $this->demoInstitution()->id,
            'is_active' => true,
        ]);
        $alumni->assignRole('alumni');

        $this->withToken($alumni->createToken('test-token')->plainTextToken)
            ->postJson('/api/v1/surveys', ['title' => 'X'])
            ->assertStatus(403);
    }

    public function test_show_returns_nested_structure(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $section = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/sections", [
            'title' => 'Profil',
        ])->assertCreated()->json('data');

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'section_id' => $section['id'],
            'type' => 'single_choice',
            'label' => 'Apakah sudah bekerja?',
            'is_required' => true,
            'options' => [
                ['label' => 'Ya', 'value' => 'yes'],
                ['label' => 'Tidak', 'value' => 'no'],
            ],
        ])->assertCreated();

        $response = $this->withToken($token)->getJson("/api/v1/surveys/{$survey['id']}")->assertOk();

        $this->assertSame($survey['id'], $response->json('data.id'));
        $this->assertCount(1, $response->json('data.sections'));
        $this->assertCount(1, $response->json('data.sections.0.questions'));
        $this->assertCount(2, $response->json('data.sections.0.questions.0.options'));
    }

    public function test_show_returns_options_and_conditions_as_arrays_for_unassigned_questions(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        // Trigger question used by the conditional question below.
        $trigger = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'single_choice',
            'label' => 'Sudah bekerja?',
            'options' => [
                ['label' => 'Ya', 'value' => 'yes'],
                ['label' => 'Tidak', 'value' => 'no'],
            ],
        ])->assertCreated()->json('data');

        // Unassigned question (no section) with options and conditions.
        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'single_choice',
            'label' => 'Pekerjaan saat ini?',
            'options' => [
                ['label' => 'Bekerja', 'value' => 'working'],
                ['label' => 'Belum bekerja', 'value' => 'unemployed'],
            ],
            'conditions' => [
                [
                    'condition_question_id' => $trigger['id'],
                    'operator' => 'equals',
                    'value' => 'yes',
                ],
            ],
        ])->assertCreated()->json('data');

        // A second unassigned question with no options/conditions at all — the
        // exact shape that crashed the survey builder (Cannot read properties
        // of undefined (reading 'length')).
        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Komentar bebas',
        ])->assertCreated();

        $response = $this->withToken($token)->getJson("/api/v1/surveys/{$survey['id']}")->assertOk();

        $unassigned = $response->json('data.questions');
        $this->assertCount(3, $unassigned);

        foreach ($unassigned as $item) {
            $this->assertIsArray($item['options'], 'options harus berupa array, bukan null');
            $this->assertIsArray($item['conditions'], 'conditions harus berupa array, bukan null');
        }
    }
}
