<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Survey\StoreQuestionRequest;
use App\Http\Requests\Survey\UpdateQuestionRequest;
use App\Http\Resources\QuestionResource;
use App\Models\Question;
use App\Models\Survey;
use App\Services\SurveyService;
use App\Support\ApiResponse;

class QuestionController extends Controller
{
    public function store(StoreQuestionRequest $request, Survey $survey)
    {
        $this->authorize('update', $survey);

        $question = app(SurveyService::class)->createQuestion($survey, $request->validated());

        return ApiResponse::success(
            new QuestionResource($question->load('options', 'conditions')),
            'Pertanyaan berhasil dibuat',
            [],
            201
        );
    }

    public function update(UpdateQuestionRequest $request, Question $question)
    {
        $this->authorize('update', $question->survey);

        $question = app(SurveyService::class)->updateQuestion($question, $request->validated());

        return ApiResponse::success(
            new QuestionResource($question->load('options', 'conditions')),
            'Pertanyaan berhasil diperbarui'
        );
    }

    public function destroy(Question $question)
    {
        $this->authorize('update', $question->survey);

        app(SurveyService::class)->deleteQuestion($question);

        return ApiResponse::success([], 'Pertanyaan berhasil dihapus');
    }
}
