<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuestionTest extends TestCase
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

    private function createSurvey(string $token): array
    {
        return $this->withToken($token)->postJson('/api/v1/surveys', [
            'title' => 'Survey Pertanyaan',
        ])->assertCreated()->json('data');
    }

    public function test_choice_question_requires_options(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'single_choice',
            'label' => 'Tanpa opsi',
        ])->assertStatus(422);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Teks biasa',
        ])->assertCreated();
    }

    public function test_invalid_type_rejected(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'checkbox',
            'label' => 'Salah tipe',
        ])->assertStatus(422);
    }

    public function test_conditional_logic_question(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $trigger = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'single_choice',
            'label' => 'Apakah Anda sudah bekerja?',
            'options' => [
                ['label' => 'Ya', 'value' => 'yes'],
                ['label' => 'Tidak', 'value' => 'no'],
            ],
        ])->assertCreated()->json('data');

        $dependent = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Nama perusahaan',
            'conditions' => [
                ['condition_question_id' => $trigger['id'], 'operator' => 'equals', 'value' => 'yes'],
            ],
        ])->assertCreated()->json('data');

        $this->assertCount(1, $dependent['conditions']);
        $this->assertSame($trigger['id'], $dependent['conditions'][0]['condition_question_id']);
        $this->assertSame('equals', $dependent['conditions'][0]['operator']);
        $this->assertSame('yes', $dependent['conditions'][0]['value']);

        $this->assertDatabaseHas('question_conditions', ['question_id' => $dependent['id']]);
    }

    public function test_condition_trigger_must_belong_to_same_survey(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);
        $foreignQuestion = Question::factory()->create();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'X',
            'conditions' => [
                ['condition_question_id' => $foreignQuestion->id, 'operator' => 'equals', 'value' => 'yes'],
            ],
        ])->assertStatus(422);
    }

    public function test_update_question_replaces_options(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $question = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'single_choice',
            'label' => 'Pilihan awal',
            'options' => [
                ['label' => 'A', 'value' => 'a'],
                ['label' => 'B', 'value' => 'b'],
            ],
        ])->assertCreated()->json('data');

        $updated = $this->withToken($token)->putJson("/api/v1/questions/{$question['id']}", [
            'label' => 'Pilihan baru',
            'options' => [
                ['label' => 'C', 'value' => 'c'],
            ],
        ])->assertOk()->json('data');

        $this->assertSame('Pilihan baru', $updated['label']);
        $this->assertCount(1, $updated['options']);
        $this->assertSame('C', $updated['options'][0]['label']);
    }

    public function test_delete_question_removes_conditions_referencing_it(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $trigger = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'yes_no',
            'label' => 'Bekerja?',
        ])->assertCreated()->json('data');

        $dependent = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Perusahaan',
            'conditions' => [
                ['condition_question_id' => $trigger['id'], 'operator' => 'equals', 'value' => 'yes'],
            ],
        ])->assertCreated()->json('data');

        $this->withToken($token)->deleteJson("/api/v1/questions/{$trigger['id']}")->assertOk();

        $this->assertDatabaseMissing('question_conditions', ['question_id' => $dependent['id']]);
        $this->assertDatabaseMissing('questions', ['id' => $trigger['id']]);
    }

    public function test_reorder_sections_and_questions(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $sectionA = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/sections", ['title' => 'A'])->assertCreated()->json('data');
        $sectionB = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/sections", ['title' => 'B'])->assertCreated()->json('data');

        $q1 = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", ['type' => 'text', 'label' => 'Q1'])->assertCreated()->json('data');
        $q2 = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", ['type' => 'text', 'label' => 'Q2'])->assertCreated()->json('data');

        $this->withToken($token)->putJson("/api/v1/surveys/{$survey['id']}/reorder", [
            'sections' => [
                ['id' => $sectionA['id'], 'order' => 2],
                ['id' => $sectionB['id'], 'order' => 1],
            ],
            'questions' => [
                ['id' => $q1['id'], 'order' => 5],
                ['id' => $q2['id'], 'order' => 3],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('survey_sections', ['id' => $sectionA['id'], 'order' => 2]);
        $this->assertDatabaseHas('survey_sections', ['id' => $sectionB['id'], 'order' => 1]);
        $this->assertDatabaseHas('questions', ['id' => $q1['id'], 'order' => 5]);
        $this->assertDatabaseHas('questions', ['id' => $q2['id'], 'order' => 3]);
    }

    public function test_long_label_accepted(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => str_repeat('a', 400),
        ])->assertCreated();
    }

    public function test_partial_update_keeps_existing_options(): void
    {
        $token = $this->loginAs('admin@smkn1tracer.sch.id');
        $survey = $this->createSurvey($token);

        $question = $this->withToken($token)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'single_choice',
            'label' => 'Pilihan',
            'options' => [
                ['label' => 'A', 'value' => 'a'],
            ],
        ])->assertCreated()->json('data');

        // Updating only the label (without options) must keep the options.
        $updated = $this->withToken($token)->putJson("/api/v1/questions/{$question['id']}", [
            'label' => 'Label baru',
        ])->assertOk()->json('data');

        $this->assertSame('Label baru', $updated['label']);
        $this->assertCount(1, $updated['options']);
    }

    public function test_tenant_isolation_cannot_update_question_of_other_survey(): void
    {
        $foreignQuestion = Question::factory()->create();

        $token = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($token)->putJson("/api/v1/questions/{$foreignQuestion->id}", ['label' => 'X'])->assertStatus(403);
        $this->withToken($token)->deleteJson("/api/v1/questions/{$foreignQuestion->id}")->assertStatus(403);
    }
}
