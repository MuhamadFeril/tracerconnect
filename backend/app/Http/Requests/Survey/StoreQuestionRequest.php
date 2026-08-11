<?php

namespace App\Http\Requests\Survey;

use App\Enums\QuestionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('survey.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $survey = $this->route('survey');

        return [
            'section_id' => ['nullable', 'uuid', Rule::exists('survey_sections', 'id')->where('survey_id', $survey->id)],
            'type' => ['required', 'string', Rule::in(QuestionType::values())],
            'label' => ['required', 'string', 'max:500'],
            'help_text' => ['nullable', 'string', 'max:1000'],
            'is_required' => ['sometimes', 'boolean'],
            'order' => ['sometimes', 'integer', 'min:0'],
            'validation_rules' => ['nullable', 'array'],
            'settings' => ['nullable', 'array'],
            'options' => ['sometimes', 'array'],
            'options.*.label' => ['required_with:options', 'string', 'max:255'],
            'options.*.value' => ['nullable', 'string', 'max:255'],
            'options.*.order' => ['sometimes', 'integer', 'min:0'],
            'conditions' => ['sometimes', 'array'],
            'conditions.*.condition_question_id' => ['required_with:conditions', 'uuid', Rule::exists('questions', 'id')->where('survey_id', $survey->id)],
            'conditions.*.operator' => ['required_with:conditions', 'string', Rule::in(['equals', 'not_equals'])],
            'conditions.*.value' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $type = QuestionType::tryFrom((string) $this->input('type', ''));

            if ($type && $type->requiresOptions() && empty($this->input('options'))) {
                $validator->errors()->add('options', 'Tipe pertanyaan ini membutuhkan minimal satu pilihan jawaban');
            }
        });
    }
}
