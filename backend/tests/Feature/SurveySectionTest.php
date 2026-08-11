<?php

namespace Tests\Feature;

use App\Models\Survey;
use App\Models\SurveySection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SurveySectionTest extends TestCase
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

    private function createDraftSurvey(string $token): array
    {
        return $this->withToken($token)->postJson('/api/v1/surveys', [
            'title' => 'Survey Section Test',
        ])->assertCreated()->json('data');
    }

    public function test_admin_can_create_update_and_delete_section(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createDraftSurvey($token);

        $section = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/sections", [
            'title' => 'Section 1',
        ])->assertCreated()->json('data');

        $this->withToken($token)->putJson("/api/v1/survey-sections/{$section['id']}", [
            'title' => 'Section 1 Baru',
        ])->assertOk()->assertJsonPath('data.title', 'Section 1 Baru');

        $this->withToken($token)->deleteJson("/api/v1/survey-sections/{$section['id']}")->assertOk();
    }

    public function test_deleting_section_keeps_questions_unassigned(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createDraftSurvey($token);

        $section = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/sections", [
            'title' => 'Section A',
        ])->assertCreated()->json('data');

        $question = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'section_id' => $section['id'],
            'type' => 'text',
            'label' => 'Pertanyaan A',
        ])->assertCreated()->json('data');

        $this->withToken($token)->deleteJson("/api/v1/survey-sections/{$section['id']}")->assertOk();

        $this->assertDatabaseHas('questions', ['id' => $question['id'], 'section_id' => null]);
    }

    public function test_section_operations_blocked_when_published(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createDraftSurvey($token);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Q',
        ])->assertCreated();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/publish")->assertOk();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/sections", [
            'title' => 'Baru',
        ])->assertStatus(422);
    }

    public function test_tenant_isolation_section_of_other_institution(): void
    {
        $otherSurvey = Survey::factory()->create();
        $section = SurveySection::factory()->create(['survey_id' => $otherSurvey->id]);

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->putJson("/api/v1/survey-sections/{$section->id}", ['title' => 'X'])->assertStatus(403);
        $this->withToken($token)->deleteJson("/api/v1/survey-sections/{$section->id}")->assertStatus(403);
    }
}
