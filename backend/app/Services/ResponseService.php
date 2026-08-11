<?php

namespace App\Services;

use App\Models\Alumni;
use App\Models\Question;
use App\Models\Survey;
use App\Models\SurveyAnswer;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ResponseService
{
    /**
     * Start (or resume) a response for the current user and survey.
     */
    public function start(User $user, Survey $survey): SurveyResponse
    {
        $this->ensureFillable($survey);

        $response = SurveyResponse::withTrashed()
            ->where('survey_id', $survey->id)
            ->where('respondent_id', $user->id)
            ->first();

        if ($response) {
            // A deleted response is revived so the respondent can refill
            // (the unique survey/respondent constraint must be kept intact).
            if ($response->trashed()) {
                $response->answers()->delete();
                $response->restore();
                $response->update([
                    'status' => 'in_progress',
                    'version' => $survey->version,
                    'started_at' => now(),
                    'submitted_at' => null,
                ]);
            }

            if ($response->status === 'submitted') {
                throw ValidationException::withMessages(['response' => 'Anda sudah mengisi survei ini']);
            }

            return $response;
        }

        return SurveyResponse::create([
            'institution_id' => $survey->institution_id,
            'survey_id' => $survey->id,
            'respondent_id' => $user->id,
            'alumni_id' => Alumni::where('user_id', $user->id)->value('id'),
            'status' => 'in_progress',
            'version' => $survey->version,
            'started_at' => now(),
        ]);
    }

    /**
     * Save a draft (answers stored without enforcing required fields).
     *
     * @param  array<int, array{question_id: string, value?: mixed}>  $answers
     */
    public function save(User $user, Survey $survey, array $answers): SurveyResponse
    {
        return $this->persist($user, $survey, $answers, submit: false);
    }

    /**
     * Validate and submit a response. Required questions must be answered.
     *
     * @param  array<int, array{question_id: string, value?: mixed}>  $answers
     */
    public function submit(User $user, Survey $survey, array $answers): SurveyResponse
    {
        return $this->persist($user, $survey, $answers, submit: true);
    }

    /**
     * @param  array<int, array{question_id: string, value?: mixed}>  $answers
     */
    private function persist(User $user, Survey $survey, array $answers, bool $submit): SurveyResponse
    {
        $this->ensureFillable($survey);

        return DB::transaction(function () use ($user, $survey, $answers, $submit) {
            $response = $this->start($user, $survey);

            $questions = $survey->questions()->with(['options', 'conditions'])->get()->keyBy('id');
            $existing = $response->answers()->pluck('value', 'question_id');

            $submitted = [];
            foreach ($answers as $answer) {
                if (! $questions->has($answer['question_id'])) {
                    throw ValidationException::withMessages([
                        "answers.{$answer['question_id']}" => 'Pertanyaan tidak ditemukan dalam survei ini',
                    ]);
                }
                $submitted[$answer['question_id']] = $answer['value'] ?? null;
            }

            $combined = array_replace($existing->all(), $submitted);

            if ($submit) {
                $this->validateSubmission($questions, $combined);
            }

            foreach ($submitted as $questionId => $value) {
                $this->validateValue($questions->get($questionId), $value);
            }

            foreach ($submitted as $questionId => $value) {
                $normalized = $this->normalizeValue($questions->get($questionId), $value);

                if ($normalized === null) {
                    SurveyAnswer::where('response_id', $response->id)
                        ->where('question_id', $questionId)
                        ->delete();

                    continue;
                }

                SurveyAnswer::updateOrCreate(
                    ['response_id' => $response->id, 'question_id' => $questionId],
                    ['value' => $normalized]
                );
            }

            if ($submit) {
                // Remove stale answers from questions hidden by conditional logic.
                $visibleIds = $this->visibleQuestionIds($questions, $combined);
                SurveyAnswer::where('response_id', $response->id)
                    ->whereNotIn('question_id', $visibleIds)
                    ->delete();

                $response->update(['status' => 'submitted', 'submitted_at' => now()]);
            }

            return $response->load('answers');
        });
    }

    /**
     * Enforce that required, currently-visible questions are answered.
     *
     * @param  Collection<string, Question>  $questions
     * @param  array<string, mixed>  $answers
     */
    private function validateSubmission(Collection $questions, array $answers): void
    {
        $visibleIds = $this->visibleQuestionIds($questions, $answers);

        foreach ($questions as $question) {
            if (! $question->is_required || ! in_array($question->id, $visibleIds, true)) {
                continue;
            }

            if ($this->isEmpty($answers[$question->id] ?? null)) {
                throw ValidationException::withMessages([
                    "answers.{$question->id}" => 'Pertanyaan ini wajib dijawab',
                ]);
            }
        }
    }

    /**
     * Validate that a provided value matches the question type.
     */
    private function validateValue(Question $question, mixed $value): void
    {
        if ($this->isEmpty($value)) {
            return;
        }

        $questionId = $question->id;
        $fail = fn (string $message) => throw ValidationException::withMessages(["answers.{$questionId}" => $message]);

        switch ($question->type) {
            case 'text':
            case 'textarea':
            case 'file':
                if (! is_string($value) || mb_strlen($value) > 5000) {
                    $fail('Jawaban harus berupa teks dengan maksimal 5000 karakter');
                }
                break;

            case 'number':
                if (! is_numeric($value)) {
                    $fail('Jawaban harus berupa angka');
                }
                break;

            case 'date':
                if (! strtotime((string) $value)) {
                    $fail('Jawaban harus berupa tanggal yang valid');
                }
                break;

            case 'yes_no':
                if (! in_array((string) $value, ['yes', 'no'], true)) {
                    $fail('Jawaban harus berupa Ya atau Tidak');
                }
                break;

            case 'single_choice':
            case 'dropdown':
                if (! $this->isValidOption($question, $value)) {
                    $fail('Pilihan jawaban tidak valid');
                }
                break;

            case 'multiple_choice':
                if (! is_array($value)) {
                    $fail('Jawaban harus berupa daftar pilihan');
                }
                foreach ($value as $item) {
                    if (! $this->isValidOption($question, $item)) {
                        $fail('Terdapat pilihan jawaban yang tidak valid');
                    }
                }
                break;

            case 'rating':
            case 'scale':
                $max = (int) (($question->settings['max'] ?? null) ?: 5);
                if (! is_numeric($value) || (int) $value < 1 || (int) $value > $max) {
                    $fail("Jawaban harus berupa angka antara 1 dan {$max}");
                }
                break;

            default:
                break;
        }
    }

    /**
     * @param  array<string, mixed>  $answers
     */
    private function normalizeValue(Question $question, mixed $value): ?string
    {
        if ($this->isEmpty($value)) {
            return null;
        }

        if ($question->type === 'multiple_choice') {
            return json_encode(array_values($value), JSON_UNESCAPED_UNICODE);
        }

        return (string) $value;
    }

    /**
     * Whether the question should currently be shown based on conditional logic.
     * A question with no conditions is always visible. Multiple conditions use AND.
     *
     * @param  Collection<string, Question>  $questions
     * @param  array<string, mixed>  $answers
     * @return array<int, string>
     */
    public function visibleQuestionIds(Collection $questions, array $answers): array
    {
        $visible = [];

        foreach ($questions as $question) {
            $satisfied = true;

            foreach ($question->conditions as $condition) {
                $trigger = (string) ($answers[$condition->condition_question_id] ?? '');
                $matches = $trigger === (string) ($condition->value ?? '');

                if ($condition->operator === 'not_equals') {
                    $matches = ! $matches;
                }

                if (! $matches) {
                    $satisfied = false;
                    break;
                }
            }

            if ($satisfied) {
                $visible[] = $question->id;
            }
        }

        return $visible;
    }

    /**
     * Whether a choice value matches one of the question options
     * (matched against both option value and option id).
     */
    private function isValidOption(Question $question, mixed $value): bool
    {
        $needle = (string) $value;

        return $question->options->contains(
            fn ($option) => $needle === (string) $option->value
                || $needle === (string) $option->id
                || $needle === (string) $option->label
        );
    }

    private function isEmpty(mixed $value): bool
    {
        return $value === null || $value === '' || $value === [];
    }

    /**
     * Responses are only possible while the survey is published and active.
     */
    private function ensureFillable(Survey $survey): void
    {
        if ($survey->status !== 'published') {
            throw ValidationException::withMessages(['survey' => 'Survey belum dipublikasikan']);
        }

        if ($survey->expires_at && $survey->expires_at->isPast()) {
            throw ValidationException::withMessages(['survey' => 'Survey sudah berakhir']);
        }

        if ($survey->starts_at && $survey->starts_at->isFuture()) {
            throw ValidationException::withMessages(['survey' => 'Survey belum dimulai']);
        }
    }
}
