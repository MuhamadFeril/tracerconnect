<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DataQualityService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DataQualityController extends Controller
{
    public function __construct(private readonly DataQualityService $service)
    {
    }

    /**
     * Data quality report for the current institution.
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('alumni.view'), 403);

        return ApiResponse::success(
            $this->service->report($request),
            'Laporan kualitas data berhasil diambil'
        );
    }
}
