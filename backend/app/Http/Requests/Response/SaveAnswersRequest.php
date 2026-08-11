<?php

namespace App\Http\Requests\Response;

use Illuminate\Foundation\Http\FormRequest;

class SaveAnswersRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // 'present' so an empty draft (cleared answers) is accepted.
            'answers' => ['present', 'array'],
            'answers.*.question_id' => ['required', 'uuid', 'exists:questions,id'],
            'answers.*.value' => ['nullable'],
        ];
    }
}
