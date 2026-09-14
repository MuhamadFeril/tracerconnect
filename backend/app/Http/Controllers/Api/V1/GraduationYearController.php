<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\GraduationYear\StoreGraduationYearRequest;
use App\Http\Requests\GraduationYear\UpdateGraduationYearRequest;
use App\Http\Resources\GraduationYearResource;
use App\Models\GraduationYear;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class GraduationYearController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', GraduationYear::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $years = GraduationYear::query()
            ->withCount('alumni')
            ->when($currentUser->institution_id !== null, fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->institution_id === null && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->orderByDesc('year')
            ->paginate($perPage);

        return ApiResponse::success(
            GraduationYearResource::collection($years->items()),
            'Data tahun lulus berhasil diambil',
            ApiResponse::paginationMeta($years)
        );
    }

    public function store(StoreGraduationYearRequest $request)
    {
        $this->authorize('create', GraduationYear::class);

        $year = GraduationYear::create($request->validated());

        return ApiResponse::success(new GraduationYearResource($year), 'Tahun lulus berhasil dibuat', [], 201);
    }

    public function show(GraduationYear $graduationYear)
    {
        $this->authorize('view', $graduationYear);

        return ApiResponse::success(new GraduationYearResource($graduationYear->loadCount('alumni')), 'Data tahun lulus berhasil diambil');
    }

    public function update(UpdateGraduationYearRequest $request, GraduationYear $graduationYear)
    {
        $this->authorize('update', $graduationYear);

        $graduationYear->update($request->validated());

        return ApiResponse::success(new GraduationYearResource($graduationYear->loadCount('alumni')), 'Tahun lulus berhasil diperbarui');
    }

    public function destroy(GraduationYear $graduationYear)
    {
        $this->authorize('delete', $graduationYear);

        $graduationYear->delete();

        return ApiResponse::success([], 'Tahun lulus berhasil dihapus');
    }
}
