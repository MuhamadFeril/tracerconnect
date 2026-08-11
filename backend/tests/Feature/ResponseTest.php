<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\Question;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResponseTest extends TestCase
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

    /**
     * A brand-new alumni account in the demo institution, so fill-flow tests
     * never clash with the seeded (already submitted) responses.
     */
    private function freshRespondent(): User
    {
        $user = User::create([
            'name' => 'Alumni Segar',
            'email' => 'alumni-segar-'.uniqid().'@test.test',
            'password' => 'password',
            'institution_id' => $this->demoInstitution()->id,
            'is_active' => true,
        ]);
        $user->assignRole('alumni');

        return $user;
    }

    private function freshRespondentToken(): string
    {
        return $this->freshRespondent()->createToken('test-token')->plainTextToken;
    }

    private function demoInstitution(): Institution
    {
        return Institution::where('slug', 'smk-negeri-1-tracer')->firstOrFail();
    }

    private function demoSurvey(): Survey
    {
        return Survey::where('institution_id', $this->demoInstitution()->id)
            ->where('title', 'Tracer Study Lulusan 2025')
            ->firstOrFail();
    }

    private function questionId(Survey $survey, string $label): string
    {
        return Question::where('survey_id', $survey->id)->where('label', $label)->value('id');
    }

    /**
     * Build the {question_id, value} payload from label => value pairs.
     *
     * @param  array<string, mixed>  $payload
     * @return array<int, array{question_id: string, value: mixed}>
     */
    private function answers(Survey $survey, array $payload): array
    {
        return collect($payload)->map(fn ($value, $label) => [
            'question_id' => $this->questionId($survey, $label),
            'value' => $value,
        ])->values()->all();
    }

    private function workingBranchAnswers(Survey $survey): array
    {
        return $this->answers($survey, [
            'Apakah Anda sudah bekerja?' => 'yes',
            'Nama perusahaan tempat Anda bekerja' => 'PT Teknologi Nusantara',
            'Jabatan / posisi Anda' => 'Software Engineer',
            'Bidang industri perusahaan' => 'teknologi-informasi',
            'Rentang gaji per bulan' => '2',
            'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)' => 5,
            'Seberapa relevan kompetensi yang diajarkan dengan pekerjaan Anda? (1-5)' => 4,
        ]);
    }

    // --- Fill flow ---------------------------------------------------------

    public function test_alumni_can_start_survey(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/start")
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress')
            ->assertJsonPath('data.survey_id', $survey->id)
            ->assertJsonCount(2, 'data.survey.sections')
            ->assertJsonStructure(['data' => ['answers', 'survey' => ['questions', 'sections']]]);
    }

    public function test_start_is_idempotent(): void
    {
        $respondent = $this->freshRespondent();
        $token = $respondent->createToken('test-token')->plainTextToken;
        $survey = $this->demoSurvey();

        $first = $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/start")->json('data.id');
        $second = $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/start")->json('data.id');

        $this->assertNotEmpty($first);
        $this->assertSame($first, $second);
        $this->assertSame(1, SurveyResponse::where('survey_id', $survey->id)
            ->where('respondent_id', $respondent->id)
            ->count());
    }

    public function test_save_draft_without_required_answers(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/save", [
            'answers' => $this->answers($survey, ['Apakah Anda sudah bekerja?' => 'yes']),
        ])->assertOk()
            ->assertJsonPath('data.answers.'.$this->questionId($survey, 'Apakah Anda sudah bekerja?'), 'yes');

        $this->assertDatabaseHas('survey_responses', ['status' => 'in_progress']);
    }

    public function test_submit_requires_required_visible_questions(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();
        $companyId = $this->questionId($survey, 'Nama perusahaan tempat Anda bekerja');

        // All required visible questions except the company name must be present,
        // so the required-error points at the missing company name.
        $answers = array_merge(
            $this->answers($survey, ['Apakah Anda sudah bekerja?' => 'yes']),
            $this->answers($survey, [
                'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)' => 5,
                'Seberapa relevan kompetensi yang diajarkan dengan pekerjaan Anda? (1-5)' => 4,
            ])
        );

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $answers,
        ])->assertStatus(422)
            ->assertJsonValidationErrors("answers.{$companyId}");
    }

    public function test_submit_working_branch_and_prunes_stale_conditional_answers(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();
        $reasonId = $this->questionId($survey, 'Alasan belum bekerja');

        // Store an answer for the hidden "no" branch while the draft says "yes".
        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/save", [
            'answers' => $this->answers($survey, [
                'Apakah Anda sudah bekerja?' => 'yes',
                'Alasan belum bekerja' => 'Iseng',
            ]),
        ])->assertOk();

        $response = $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $this->workingBranchAnswers($survey),
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'submitted')
            ->json('data');

        // The hidden branch answer must have been pruned on submit
        // (only within this respondent's response).
        $this->assertDatabaseMissing('survey_answers', [
            'response_id' => $response['id'],
            'question_id' => $reasonId,
        ]);
    }

    public function test_conditional_required_enforced_on_no_branch(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();
        $reasonId = $this->questionId($survey, 'Alasan belum bekerja');

        $answers = array_merge(
            $this->answers($survey, ['Apakah Anda sudah bekerja?' => 'no']),
            $this->answers($survey, [
                'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)' => 4,
                'Seberapa relevan kompetensi yang diajarkan dengan pekerjaan Anda? (1-5)' => 3,
            ])
        );

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $answers,
        ])->assertStatus(422)
            ->assertJsonValidationErrors("answers.{$reasonId}");
    }

    public function test_submit_not_working_branch_succeeds(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $this->answers($survey, [
                'Apakah Anda sudah bekerja?' => 'no',
                'Alasan belum bekerja' => 'Melanjutkan pendidikan',
                'Apakah Anda sedang melanjutkan pendidikan?' => 'yes',
                'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)' => 4,
                'Seberapa relevan kompetensi yang diajarkan dengan pekerjaan Anda? (1-5)' => 3,
            ]),
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'submitted');
    }

    public function test_duplicate_submit_rejected(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $this->workingBranchAnswers($survey),
        ])->assertStatus(201);

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $this->workingBranchAnswers($survey),
        ])->assertStatus(422)
            ->assertJsonValidationErrors('response');
    }

    // --- Value validation ---------------------------------------------------

    public function test_single_choice_rejects_unknown_value(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $this->answers($survey, [
                'Apakah Anda sudah bekerja?' => 'mungkin',
                'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)' => 5,
                'Seberapa relevan kompetensi yang diajarkan dengan pekerjaan Anda? (1-5)' => 4,
            ]),
        ])->assertStatus(422)
            ->assertJsonValidationErrors('answers.'.$this->questionId($survey, 'Apakah Anda sudah bekerja?'));
    }

    public function test_rating_rejects_out_of_range(): void
    {
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();
        $ratingId = $this->questionId($survey, 'Seberapa puas Anda dengan kualitas pembelajaran di sekolah? (1-5)');

        // Full working branch but with an out-of-range rating.
        $answers = $this->workingBranchAnswers($survey);
        foreach ($answers as &$answer) {
            if ($answer['question_id'] === $ratingId) {
                $answer['value'] = 9;
            }
        }

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $answers,
        ])->assertStatus(422)
            ->assertJsonValidationErrors("answers.{$ratingId}");
    }

    public function test_multiple_choice_stored_as_array(): void
    {
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $survey = $this->withToken($adminToken)->postJson('/api/v1/surveys', [
            'title' => 'Survey Keahlian',
        ])->assertCreated()->json('data');

        $question = $this->withToken($adminToken)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'multiple_choice',
            'label' => 'Keahlian yang dikuasai',
            'is_required' => true,
            'options' => [
                ['label' => 'Pemrograman', 'value' => 'programming'],
                ['label' => 'Desain', 'value' => 'design'],
            ],
        ])->assertCreated()->json('data');

        $this->withToken($adminToken)->postJson("/api/v1/surveys/{$survey['id']}/publish")->assertOk();

        $alumniToken = $this->loginAs('andi.pratama@example.com');

        $this->withToken($alumniToken)->postJson("/api/v1/surveys/{$survey['id']}/responses/submit", [
            'answers' => [['question_id' => $question['id'], 'value' => ['programming', 'design']]],
        ])->assertStatus(201)
            ->assertJsonPath("data.answers.{$question['id']}", ['programming', 'design']);
    }

    // --- Availability --------------------------------------------------------

    public function test_submit_rejected_for_unpublished_survey(): void
    {
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $survey = $this->withToken($adminToken)->postJson('/api/v1/surveys', [
            'title' => 'Survey Draft',
        ])->assertCreated()->json('data');

        $question = $this->withToken($adminToken)->postJson("/api/v1/surveys/{$survey['id']}/questions", [
            'type' => 'text',
            'label' => 'Nama',
            'is_required' => true,
        ])->assertCreated()->json('data');

        $alumniToken = $this->freshRespondentToken();

        $this->withToken($alumniToken)->postJson("/api/v1/surveys/{$survey['id']}/responses/submit", [
            'answers' => [['question_id' => $question['id'], 'value' => null]],
        ])->assertStatus(422)
            ->assertJsonValidationErrors('survey');
    }

    public function test_submit_rejected_for_expired_survey(): void
    {
        $survey = Survey::factory()->create([
            'institution_id' => $this->demoInstitution()->id,
            'status' => 'published',
            'published_at' => now()->subDays(10),
            'expires_at' => now()->subDay(),
        ]);

        $question = Question::factory()->create([
            'survey_id' => $survey->id,
            'type' => 'text',
            'label' => 'Nama',
            'is_required' => true,
        ]);

        $token = $this->freshRespondentToken();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => [['question_id' => $question->id, 'value' => null]],
        ])->assertStatus(422)
            ->assertJsonValidationErrors('survey');
    }

    public function test_in_progress_draft_on_expired_survey_reported_as_expired(): void
    {
        $survey = Survey::factory()->create([
            'institution_id' => $this->demoInstitution()->id,
            'status' => 'published',
            'expires_at' => now()->subDay(),
        ]);

        $respondent = $this->freshRespondent();

        SurveyResponse::create([
            'institution_id' => $this->demoInstitution()->id,
            'survey_id' => $survey->id,
            'respondent_id' => $respondent->id,
            'status' => 'in_progress',
            'version' => 1,
            'started_at' => now()->subDays(2),
        ]);

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $this->withToken($adminToken)->getJson('/api/v1/responses?status=expired')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'expired');
    }

    public function test_answer_for_question_of_another_survey_rejected(): void
    {
        $other = Question::factory()->create();
        $token = $this->freshRespondentToken();
        $survey = $this->demoSurvey();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => [['question_id' => $other->id, 'value' => 'x']],
        ])->assertStatus(422);
    }

    // --- Admin / ownership ---------------------------------------------------

    public function test_respondent_can_view_own_response(): void
    {
        $respondent = $this->freshRespondent();
        $token = $respondent->createToken('test-token')->plainTextToken;
        $survey = $this->demoSurvey();

        $this->withToken($token)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $this->workingBranchAnswers($survey),
        ])->assertStatus(201);

        $response = SurveyResponse::where('survey_id', $survey->id)
            ->where('respondent_id', $respondent->id)
            ->firstOrFail();

        $this->withToken($token)->getJson("/api/v1/responses/{$response->id}")
            ->assertOk()
            ->assertJsonPath('data.survey.title', 'Tracer Study Lulusan 2025')
            ->assertJsonPath("data.answers.{$this->questionId($survey, 'Apakah Anda sudah bekerja?')}", 'yes');
    }

    public function test_alumni_cannot_view_other_respondents_response(): void
    {
        $survey = $this->demoSurvey();
        $fitriResponse = SurveyResponse::whereHas('respondent', fn ($q) => $q->where('email', 'fitri.handayani@example.com'))->firstOrFail();

        $andiToken = $this->loginAs('andi.pratama@example.com');

        $this->withToken($andiToken)->getJson("/api/v1/responses/{$fitriResponse->id}")->assertStatus(403);
    }

    public function test_staff_can_review_response_detail(): void
    {
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = SurveyResponse::whereHas('respondent', fn ($q) => $q->where('email', 'andi.pratama@example.com'))->firstOrFail();

        $this->withToken($adminToken)->getJson("/api/v1/responses/{$response->id}")
            ->assertOk()
            ->assertJsonPath('data.respondent.name', 'Andi Pratama')
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonStructure(['data' => ['answers' => [['question' => ['label', 'type']]]]]);
    }

    public function test_admin_index_lists_responses_with_completion(): void
    {
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = $this->withToken($adminToken)->getJson('/api/v1/responses')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->json('data');

        $andi = collect($response)->firstWhere('respondent.email', 'andi.pratama@example.com');

        // 7 of 10 questions answered -> 70% completion.
        $this->assertSame(70, $andi['completion']);
        $this->assertSame(7, $andi['answers_count']);
    }

    public function test_tenant_isolation_for_responses(): void
    {
        $superToken = $this->loginAs('superadmin@tracerconnect.test');
        $other = Institution::create([
            'name' => 'Institusi Lain',
            'slug' => 'institusi-lain-response',
            'code' => 'IR01',
            'status' => 'active',
        ]);

        $otherSurvey = Survey::factory()->create([
            'institution_id' => $other->id,
            'status' => 'published',
        ]);

        Question::factory()->create([
            'survey_id' => $otherSurvey->id,
            'label' => 'Nama',
            'is_required' => true,
        ]);

        $otherUser = User::create([
            'name' => 'Alumni Lain',
            'email' => 'alumni-lain@test.test',
            'password' => 'password',
            'institution_id' => $other->id,
            'is_active' => true,
        ]);
        $otherUser->assignRole('alumni');

        $otherResponse = SurveyResponse::create([
            'institution_id' => $other->id,
            'survey_id' => $otherSurvey->id,
            'respondent_id' => $otherUser->id,
            'status' => 'in_progress',
            'version' => 1,
            'started_at' => now(),
        ]);

        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $ids = collect($this->withToken($adminToken)->getJson('/api/v1/responses')->json('data'))->pluck('id');
        $this->assertNotContains($otherResponse->id, $ids->all());

        $this->withToken($adminToken)->getJson("/api/v1/responses/{$otherResponse->id}")->assertStatus(403);
        $this->withToken($adminToken)->deleteJson("/api/v1/responses/{$otherResponse->id}")->assertStatus(403);
    }

    public function test_admin_can_delete_and_respondent_can_refill(): void
    {
        $survey = $this->demoSurvey();
        $andi = User::where('email', 'andi.pratama@example.com')->firstOrFail();
        $adminToken = $this->loginAs('admin@smkn1tracer.sch.id');

        $response = SurveyResponse::where('survey_id', $survey->id)->where('respondent_id', $andi->id)->firstOrFail();

        $this->withToken($adminToken)->deleteJson("/api/v1/responses/{$response->id}")->assertOk();

        $andiToken = $andi->createToken('test-token')->plainTextToken;

        $this->withToken($andiToken)->postJson("/api/v1/surveys/{$survey->id}/responses/submit", [
            'answers' => $this->workingBranchAnswers($survey),
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'submitted');
    }

    public function test_my_history_returns_own_responses(): void
    {
        $token = $this->loginAs('andi.pratama@example.com');

        $this->withToken($token)->getJson('/api/v1/responses/my')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'submitted');
    }

    public function test_viewer_can_list_responses_but_not_delete(): void
    {
        $viewer = User::create([
            'name' => 'Viewer Response',
            'email' => 'viewer-response@test.test',
            'password' => 'password',
            'institution_id' => $this->demoInstitution()->id,
            'is_active' => true,
        ]);
        $viewer->assignRole('viewer');

        $token = $viewer->createToken('test-token')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/responses')->assertOk();

        $response = SurveyResponse::firstOrFail();

        $this->withToken($token)->deleteJson("/api/v1/responses/{$response->id}")->assertStatus(403);
    }
}
