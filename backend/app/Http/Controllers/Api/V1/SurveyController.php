<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Survey\ReorderRequest;
use App\Http\Requests\Survey\StoreSurveyRequest;
use App\Http\Requests\Survey\UpdateSurveyRequest;
use App\Http\Resources\SurveyDetailResource;
use App\Http\Resources\SurveyResource;
use App\Models\Survey;
use App\Services\NotificationService;
use App\Services\SurveyService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class SurveyController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Survey::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $surveys = Survey::query()
            ->withCount('sections', 'questions')
            ->when(! $currentUser->hasRole('super_admin'), fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->hasRole('super_admin') && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $query->where('title', 'like', '%'.trim((string) $request->search).'%');
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return ApiResponse::success(
            SurveyResource::collection($surveys->items()),
            'Data survey berhasil diambil',
            ApiResponse::paginationMeta($surveys)
        );
    }

    public function store(StoreSurveyRequest $request)
    {
        $this->authorize('create', Survey::class);

        $data = $request->validated();

        $survey = app(SurveyService::class)->store(
            $data,
            $data['institution_id'],
            $request->user()->id
        );

        return ApiResponse::success(new SurveyResource($survey), 'Survey berhasil dibuat', [], 201);
    }

    public function show(Survey $survey)
    {
        $this->authorize('view', $survey);

        $survey->load([
            'sections.questions.options',
            'sections.questions.conditions',
            // Unassigned questions (section_id null) also need their
            // options/conditions eager-loaded, otherwise QuestionResource
            // falls back to an empty array.
            'questions.options',
            'questions.conditions',
        ]);

        return ApiResponse::success(new SurveyDetailResource($survey), 'Data survey berhasil diambil');
    }

    public function update(UpdateSurveyRequest $request, Survey $survey)
    {
        $this->authorize('update', $survey);

        $survey->update($request->validated());

        return ApiResponse::success(new SurveyResource($survey->loadCount('sections', 'questions')), 'Survey berhasil diperbarui');
    }

    public function destroy(Survey $survey)
    {
        $this->authorize('delete', $survey);

        $survey->delete();

        return ApiResponse::success([], 'Survey berhasil dihapus');
    }

    public function publish(Survey $survey)
    {
        $this->authorize('publish', $survey);

        $survey = app(SurveyService::class)->publish($survey);

        NotificationService::notifyAlumni(
            $survey->institution_id,
            'Survey baru tersedia',
            "Survey '{$survey->title}' siap diisi",
            '/home',
            'survey'
        );

        return ApiResponse::success(new SurveyResource($survey->loadCount('sections', 'questions')), 'Survey berhasil dipublikasikan');
    }

    public function unpublish(Survey $survey)
    {
        $this->authorize('unpublish', $survey);

        $survey = app(SurveyService::class)->unpublish($survey);

        return ApiResponse::success(new SurveyResource($survey->loadCount('sections', 'questions')), 'Survey kembali ke status draft');
    }

    public function reorder(ReorderRequest $request, Survey $survey)
    {
        $this->authorize('reorder', $survey);

        app(SurveyService::class)->reorder($survey, $request->validated());

        return ApiResponse::success([], 'Urutan berhasil diperbarui');
    }
}
