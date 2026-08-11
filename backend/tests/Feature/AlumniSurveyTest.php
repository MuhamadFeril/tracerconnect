<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Question;
use App\Models\Survey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlumniSurveyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_alumni_can_list_available_published_surveys(): void
    {
        $institution = Institution::factory()->create();
        $survey = Survey::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
            'starts_at' => null,
            'expires_at' => null,
        ]);

        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/alumni/surveys')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $survey->id)
            ->assertJsonPath('data.0.response.status', 'not_started')
            ->assertJsonStructure(['data' => [['id', 'title', 'questions_count', 'response' => ['status', 'completion']]]]);
    }

    public function test_alumni_without_institution_sees_no_surveys(): void
    {
        $institution = Institution::factory()->create();
        Survey::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
            'starts_at' => null,
            'expires_at' => null,
        ]);

        $alumni = User::factory()->create(['institution_id' => null]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/alumni/surveys')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_draft_and_expired_surveys_are_hidden(): void
    {
        $institution = Institution::factory()->create();
        Survey::factory()->create(['institution_id' => $institution->id, 'status' => 'draft']);
        Survey::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
            'expires_at' => now()->subDay(),
        ]);
        $active = Survey::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
            'starts_at' => null,
            'expires_at' => null,
        ]);

        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/alumni/surveys')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $active->id);
    }

    public function test_surveys_are_scoped_to_the_alumni_institution(): void
    {
        $mine = Institution::factory()->create();
        $other = Institution::factory()->create();
        $mySurvey = Survey::factory()->create([
            'institution_id' => $mine->id,
            'status' => 'published',
            'starts_at' => null,
            'expires_at' => null,
        ]);
        Survey::factory()->create([
            'institution_id' => $other->id,
            'status' => 'published',
            'starts_at' => null,
            'expires_at' => null,
        ]);

        $alumni = User::factory()->create(['institution_id' => $mine->id]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/alumni/surveys')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mySurvey->id);
    }

    public function test_response_status_progresses_through_start_and_submit(): void
    {
        $institution = Institution::factory()->create();
        $survey = Survey::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
            'starts_at' => null,
            'expires_at' => null,
        ]);
        $question = Question::factory()->create([
            'survey_id' => $survey->id,
            'section_id' => null,
            'type' => 'text',
            'label' => 'Nama lengkap',
            'is_required' => true,
        ]);

        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        // Start -> in_progress
        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');

        $this->withToken($token)->getJson('/api/v1/alumni/surveys')
            ->assertOk()
            ->assertJsonPath('data.0.response.status', 'in_progress');

        // Submit with the required question answered -> submitted, 100%.
        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => [['question_id' => $question->id, 'value' => 'Budi Santoso']],
        ])->assertStatus(201)->assertJsonPath('data.status', 'submitted');

        $this->withToken($token)->getJson('/api/v1/alumni/surveys')
            ->assertOk()
            ->assertJsonPath('data.0.response.status', 'submitted')
            ->assertJsonPath('data.0.response.completion', 100);
    }

    public function test_survey_list_requires_authentication(): void
    {
        $this->getJson('/api/v1/alumni/surveys')->assertStatus(401);
    }

    public function test_alumni_can_view_their_own_submitted_answers(): void
    {
        $institution = Institution::factory()->create();
        $survey = Survey::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
            'starts_at' => null,
            'expires_at' => null,
        ]);
        $question = Question::factory()->create([
            'survey_id' => $survey->id,
            'section_id' => null,
            'type' => 'text',
            'label' => 'Nama lengkap',
            'is_required' => true,
        ]);

        $alumni = User::factory()->create(['institution_id' => $institution->id]);
        $alumni->assignRole('alumni');
        $token = $alumni->createToken('test-token')->plainTextToken;

        $submit = $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => [['question_id' => $question->id, 'value' => 'Budi Santoso']],
        ])->assertStatus(201);

        $responseId = $submit->json('data.id');

        $this->withToken($token)->getJson("/api/v1/responses/{$responseId}")
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.survey.title', $survey->title)
            ->assertJsonPath("data.answers.{$question->id}", 'Budi Santoso')
            ->assertJsonStructure(['data' => ['id', 'survey_id', 'status', 'survey' => ['sections', 'questions'], 'answers']]);
    }

    public function test_alumni_cannot_view_another_alumni_response(): void
    {
        $institution = Institution::factory()->create();
        $survey = Survey::factory()->create([
            'institution_id' => $institution->id,
            'status' => 'published',
            'starts_at' => null,
            'expires_at' => null,
        ]);
        $question = Question::factory()->create([
            'survey_id' => $survey->id,
            'section_id' => null,
            'type' => 'text',
            'label' => 'Nama lengkap',
            'is_required' => true,
        ]);

        $owner = User::factory()->create(['institution_id' => $institution->id]);
        $owner->assignRole('alumni');
        $ownerToken = $owner->createToken('test-token')->plainTextToken;

        $submit = $this->withToken($ownerToken)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => [['question_id' => $question->id, 'value' => 'Jawaban Rahasia']],
        ])->assertStatus(201);
        $responseId = $submit->json('data.id');

        $other = User::factory()->create(['institution_id' => $institution->id]);
        $other->assignRole('alumni');
        $otherToken = $other->createToken('test-token')->plainTextToken;

        $this->withToken($otherToken)->getJson("/api/v1/responses/{$responseId}")->assertStatus(403);
    }
}
