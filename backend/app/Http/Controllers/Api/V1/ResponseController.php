<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Response\SaveAnswersRequest;
use App\Http\Resources\SurveyFillResource;
use App\Http\Resources\SurveyResponseDetailResource;
use App\Http\Resources\SurveyResponseResource;
use App\Models\Question;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Services\ResponseService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class ResponseController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', SurveyResponse::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $responses = SurveyResponse::query()
            ->with(['survey:id,title,version,institution_id,expires_at', 'respondent:id,name,email', 'alumni:id,name,nis_nim'])
            ->withCount('answers')
            ->addSelect(['survey_questions_count' => Question::selectRaw('count(*)')
                ->whereColumn('questions.survey_id', 'survey_responses.survey_id')])
            ->when(! $currentUser->hasRole('super_admin'), fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->hasRole('super_admin') && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->when($request->filled('survey_id'), fn ($query) => $query->where('survey_id', $request->survey_id))
            ->when($request->filled('status'), function ($query) use ($request) {
                // 'expired' is derived: an in-progress draft on an expired survey.
                if ($request->status === 'expired') {
                    $query->where('status', 'in_progress')
                        ->whereHas('survey', fn ($survey) => $survey->where('expires_at', '<', now()));

                    return;
                }

                $query->where('status', $request->status);
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = '%'.trim((string) $request->search).'%';

                $query->whereHas('respondent', fn ($respondent) => $respondent
                    ->where('name', 'like', $search)
                    ->orWhere('email', 'like', $search));
            })
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return ApiResponse::success(
            SurveyResponseResource::collection($responses->items()),
            'Data respons berhasil diambil',
            ApiResponse::paginationMeta($responses)
        );
    }

    /**
     * The current user's own response history.
     */
    public function my(Request $request)
    {
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $responses = SurveyResponse::query()
            ->with(['survey:id,title,version,institution_id,expires_at', 'respondent:id,name,email', 'alumni:id,name,nis_nim'])
            ->withCount('answers')
            ->addSelect(['survey_questions_count' => Question::selectRaw('count(*)')
                ->whereColumn('questions.survey_id', 'survey_responses.survey_id')])
            ->where('respondent_id', $request->user()->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return ApiResponse::success(
            SurveyResponseResource::collection($responses->items()),
            'Riwayat respons berhasil diambil',
            ApiResponse::paginationMeta($responses)
        );
    }

    /**
     * Start (or resume) filling a survey.
     */
    public function start(Request $request, Survey $survey)
    {
        $this->authorize('start', $survey);

        $response = app(ResponseService::class)->start($request->user(), $survey);

        return ApiResponse::success(
            new SurveyFillResource($response->loadMissing(['survey', 'answers'])),
            'Survey dimulai, silakan isi jawaban Anda'
        );
    }

    /**
     * Save a draft (partial answers, required not enforced).
     */
    public function save(SaveAnswersRequest $request, Survey $survey)
    {
        $this->authorize('save', $survey);

        $response = app(ResponseService::class)->save($request->user(), $survey, $request->validated('answers'));

        return ApiResponse::success(
            new SurveyFillResource($response->loadMissing(['survey', 'answers'])),
            'Draft jawaban berhasil disimpan'
        );
    }

    /**
     * Submit the response (required + conditional validation enforced).
     */
    public function submit(SaveAnswersRequest $request, Survey $survey)
    {
        $this->authorize('submit', $survey);

        $response = app(ResponseService::class)->submit($request->user(), $survey, $request->validated('answers'));

        return ApiResponse::success(
            new SurveyFillResource($response->loadMissing(['survey', 'answers'])),
            'Respons berhasil dikirim',
            [],
            201
        );
    }

    /**
     * Owner resumes their own response; staff sees the admin review detail.
     */
    public function show(Request $request, SurveyResponse $response)
    {
        $this->authorize('view', $response);

        if ($response->respondent_id === $request->user()->id) {
            return ApiResponse::success(
                new SurveyFillResource($response->loadMissing(['survey', 'answers'])),
                'Data respons berhasil diambil'
            );
        }

        $response->load(['survey', 'respondent', 'alumni', 'answers.question']);

        return ApiResponse::success(
            new SurveyResponseDetailResource($response),
            'Data respons berhasil diambil'
        );
    }

    public function destroy(SurveyResponse $response)
    {
        $this->authorize('delete', $response);

        $response->delete();

        return ApiResponse::success([], 'Respons berhasil dihapus');
    }
}
