<?php

namespace App\Services;

use App\Models\Question;
use App\Models\QuestionCondition;
use App\Models\QuestionOption;
use App\Models\Survey;
use App\Models\SurveySection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SurveyService
{
    /**
     * Create a new draft survey.
     *
     * @param  array<string, mixed>  $data
     */
    public function store(array $data, string $institutionId, string $createdBy): Survey
    {
        return Survey::create([
            'institution_id' => $institutionId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => 'draft',
            'version' => 1,
            'starts_at' => $data['starts_at'] ?? null,
            'expires_at' => $data['expires_at'] ?? null,
            'created_by' => $createdBy,
        ]);
    }

    /**
     * Publish a draft survey. A re-publish creates a new version.
     */
    public function publish(Survey $survey): Survey
    {
        if ($survey->status === 'published') {
            throw ValidationException::withMessages(['status' => 'Survey sudah dalam status publikasi']);
        }

        if ($survey->questions()->count() === 0) {
            throw ValidationException::withMessages(['questions' => 'Survey harus memiliki minimal satu pertanyaan sebelum dipublikasikan']);
        }

        $survey->update([
            'status' => 'published',
            'published_at' => now(),
            'version' => $survey->published_at ? $survey->version + 1 : $survey->version,
        ]);

        return $survey;
    }

    /**
     * Move a published survey back to draft for editing.
     */
    public function unpublish(Survey $survey): Survey
    {
        $survey->update(['status' => 'draft']);

        return $survey;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createSection(Survey $survey, array $data): SurveySection
    {
        $this->ensureEditable($survey);

        return $survey->sections()->create([
            'title' => $data['title'] ?? null,
            'description' => $data['description'] ?? null,
            'order' => $data['order'] ?? ($survey->sections()->max('order') + 1),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateSection(SurveySection $section, array $data): SurveySection
    {
        $this->ensureEditable($section->survey);

        $section->update([
            'title' => array_key_exists('title', $data) ? $data['title'] : $section->title,
            'description' => array_key_exists('description', $data) ? $data['description'] : $section->description,
            'order' => $data['order'] ?? $section->order,
        ]);

        return $section;
    }

    public function deleteSection(SurveySection $section): void
    {
        $this->ensureEditable($section->survey);

        // Keep questions; they just become unassigned.
        $section->questions()->update(['section_id' => null]);
        $section->delete();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createQuestion(Survey $survey, array $data): Question
    {
        $this->ensureEditable($survey);

        return DB::transaction(function () use ($survey, $data) {
            $question = $survey->questions()->create([
                'section_id' => $data['section_id'] ?? null,
                'type' => $data['type'],
                'label' => $data['label'],
                'help_text' => $data['help_text'] ?? null,
                'is_required' => (bool) ($data['is_required'] ?? false),
                'order' => $data['order'] ?? ($survey->questions()->max('order') + 1),
                'validation_rules' => $data['validation_rules'] ?? null,
                'settings' => $data['settings'] ?? null,
            ]);

            $this->syncOptions($question, $data['options'] ?? []);
            $this->syncConditions($question, $data['conditions'] ?? []);

            return $question;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateQuestion(Question $question, array $data): Question
    {
        $this->ensureEditable($question->survey);

        return DB::transaction(function () use ($question, $data) {
            $question->update([
                'section_id' => array_key_exists('section_id', $data) ? $data['section_id'] : $question->section_id,
                'type' => $data['type'] ?? $question->type,
                'label' => $data['label'] ?? $question->label,
                'help_text' => array_key_exists('help_text', $data) ? $data['help_text'] : $question->help_text,
                'is_required' => array_key_exists('is_required', $data) ? (bool) $data['is_required'] : $question->is_required,
                'order' => $data['order'] ?? $question->order,
                'validation_rules' => array_key_exists('validation_rules', $data) ? $data['validation_rules'] : $question->validation_rules,
                'settings' => array_key_exists('settings', $data) ? $data['settings'] : $question->settings,
            ]);

            if (array_key_exists('options', $data)) {
                $this->syncOptions($question, $data['options']);
            }

            if (array_key_exists('conditions', $data)) {
                $this->syncConditions($question, $data['conditions']);
            }

            return $question->fresh();
        });
    }

    public function deleteQuestion(Question $question): void
    {
        $this->ensureEditable($question->survey);

        // Conditions referencing this question as trigger must be removed too.
        QuestionCondition::where('condition_question_id', $question->id)->delete();

        $question->delete();
    }

    /**
     * Bulk update section/question ordering.
     *
     * @param  array<string, mixed>  $data
     */
    public function reorder(Survey $survey, array $data): void
    {
        $this->ensureEditable($survey);

        foreach ($data['sections'] ?? [] as $item) {
            SurveySection::where('survey_id', $survey->id)
                ->whereKey($item['id'])
                ->update(['order' => $item['order']]);
        }

        foreach ($data['questions'] ?? [] as $item) {
            Question::where('survey_id', $survey->id)
                ->whereKey($item['id'])
                ->update(['order' => $item['order']]);
        }
    }

    /**
     * Structural changes are only allowed while the survey is a draft.
     */
    public function ensureEditable(Survey $survey): void
    {
        if ($survey->status === 'published') {
            throw ValidationException::withMessages(['survey' => 'Survey sudah dipublikasikan. Unpublish terlebih dahulu untuk mengubah struktur.']);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $options
     */
    private function syncOptions(Question $question, array $options): void
    {
        $question->options()->delete();

        foreach ($options as $index => $option) {
            QuestionOption::create([
                'question_id' => $question->id,
                'label' => $option['label'],
                'value' => $option['value'] ?? null,
                'order' => $option['order'] ?? $index,
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $conditions
     */
    private function syncConditions(Question $question, array $conditions): void
    {
        $question->conditions()->delete();

        foreach ($conditions as $condition) {
            QuestionCondition::create([
                'question_id' => $question->id,
                'condition_question_id' => $condition['condition_question_id'],
                'operator' => $condition['operator'],
                'value' => $condition['value'] ?? null,
            ]);
        }
    }
}
