<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Services\AnalyticsService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(private readonly AnalyticsService $analytics)
    {
    }

    /**
     * Tenant-scoped dashboard summary (phase 6).
     */
    public function overview(Request $request)
    {
        abort_unless($request->user()->can('analytics.view'), 403);

        return ApiResponse::success(
            $this->analytics->overview($request),
            'Ringkasan analitik berhasil diambil'
        );
    }

    /**
     * Employment breakdown with graduation-year and department comparisons.
     */
    public function employment(Request $request)
    {
        abort_unless($request->user()->can('analytics.view'), 403);

        return ApiResponse::success(
            $this->analytics->employment($request),
            'Data status pekerjaan berhasil diambil'
        );
    }

    /**
     * Aggregate answers of a survey into per-question statistics.
     */
    public function surveyResults(Request $request, Survey $survey)
    {
        abort_unless($request->user()->can('analytics.view'), 403);

        if ($request->user()->institution_id !== null && $survey->institution_id !== $request->user()->institution_id) {
            abort(403);
        }

        return ApiResponse::success(
            $this->analytics->surveyResults($request, $survey),
            'Hasil survey berhasil diambil'
        );
    }
}
