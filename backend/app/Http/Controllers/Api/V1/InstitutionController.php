<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Institution\StoreInstitutionRequest;
use App\Http\Requests\Institution\UpdateInstitutionRequest;
use App\Http\Resources\InstitutionResource;
use App\Models\Department;
use App\Models\Institution;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstitutionController extends Controller
{
    /**
     * Public list of active institutions, used by the registration form
     * so new alumni can choose their institution. No auth required.
     */
    public function options(): JsonResponse
    {
        $institutions = Institution::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'logo_path', 'website']);

        return ApiResponse::success(
            $institutions->map(fn (Institution $institution) => [
                'id' => $institution->id,
                'name' => $institution->name,
                'code' => $institution->code,
                'logo_path' => $institution->logo_path,
                'website' => $institution->website,
            ])->values(),
            'Daftar institusi berhasil diambil'
        );
    }

    /**
     * Public list of departments for a given institution.
     * Used by the registration form so alumni see only their school's departments.
     */
    public function departments(string $institutionId): JsonResponse
    {
        $institution = Institution::where('id', $institutionId)
            ->where('status', 'active')
            ->first();

        if (! $institution) {
            return ApiResponse::error('Institusi tidak ditemukan', [], 404);
        }

        $departments = Department::where('institution_id', $institution->id)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return ApiResponse::success(
            $departments->map(fn (Department $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'code' => $d->code,
            ])->values(),
            'Daftar jurusan berhasil diambil'
        );
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Institution::class);

        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $institutions = Institution::query()
            ->withCount('users')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = addcslashes(trim((string) $request->search), '%_\\');
                $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return ApiResponse::success(
            InstitutionResource::collection($institutions->items()),
            'Data institusi berhasil diambil',
            ApiResponse::paginationMeta($institutions)
        );
    }

    public function store(StoreInstitutionRequest $request)
    {
        $this->authorize('create', Institution::class);

        $institution = Institution::create($request->validated());

        return ApiResponse::success(
            new InstitutionResource($institution->loadCount('users')),
            'Institusi berhasil dibuat',
            [],
            201
        );
    }

    public function show(Institution $institution)
    {
        $this->authorize('view', $institution);

        return ApiResponse::success(
            new InstitutionResource($institution->loadCount('users')),
            'Data institusi berhasil diambil'
        );
    }

    public function update(UpdateInstitutionRequest $request, Institution $institution)
    {
        $this->authorize('update', $institution);

        $institution->update($request->validated());

        return ApiResponse::success(
            new InstitutionResource($institution->loadCount('users')),
            'Institusi berhasil diperbarui'
        );
    }

    public function destroy(Institution $institution)
    {
        $this->authorize('delete', $institution);

        $institution->delete();

        return ApiResponse::success([], 'Institusi berhasil dihapus');
    }
}
