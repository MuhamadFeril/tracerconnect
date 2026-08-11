<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Survey\StoreSectionRequest;
use App\Http\Requests\Survey\UpdateSectionRequest;
use App\Http\Resources\SurveySectionResource;
use App\Models\Survey;
use App\Models\SurveySection;
use App\Services\SurveyService;
use App\Support\ApiResponse;

class SurveySectionController extends Controller
{
    public function store(StoreSectionRequest $request, Survey $survey)
    {
        $this->authorize('update', $survey);

        $section = app(SurveyService::class)->createSection($survey, $request->validated());

        return ApiResponse::success(new SurveySectionResource($section), 'Section berhasil dibuat', [], 201);
    }

    public function update(UpdateSectionRequest $request, SurveySection $survey_section)
    {
        $this->authorize('update', $survey_section->survey);

        $section = app(SurveyService::class)->updateSection($survey_section, $request->validated());

        return ApiResponse::success(new SurveySectionResource($section), 'Section berhasil diperbarui');
    }

    public function destroy(SurveySection $survey_section)
    {
        $this->authorize('update', $survey_section->survey);

        app(SurveyService::class)->deleteSection($survey_section);

        return ApiResponse::success([], 'Section berhasil dihapus');
    }
}
