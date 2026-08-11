<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Department\StoreDepartmentRequest;
use App\Http\Requests\Department\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Department::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $departments = Department::query()
            ->withCount('alumni')
            ->when(! $currentUser->hasRole('super_admin'), fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->hasRole('super_admin') && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->search);
                $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%"));
            })
            ->orderBy('name')
            ->paginate($perPage);

        return ApiResponse::success(
            DepartmentResource::collection($departments->items()),
            'Data jurusan berhasil diambil',
            ApiResponse::paginationMeta($departments)
        );
    }

    public function store(StoreDepartmentRequest $request)
    {
        $this->authorize('create', Department::class);

        $department = Department::create($request->validated());

        return ApiResponse::success(new DepartmentResource($department), 'Jurusan berhasil dibuat', [], 201);
    }

    public function show(Department $department)
    {
        $this->authorize('view', $department);

        return ApiResponse::success(new DepartmentResource($department->loadCount('alumni')), 'Data jurusan berhasil diambil');
    }

    public function update(UpdateDepartmentRequest $request, Department $department)
    {
        $this->authorize('update', $department);

        $department->update($request->validated());

        return ApiResponse::success(new DepartmentResource($department->loadCount('alumni')), 'Jurusan berhasil diperbarui');
    }

    public function destroy(Department $department)
    {
        $this->authorize('delete', $department);

        $department->delete();

        return ApiResponse::success([], 'Jurusan berhasil dihapus');
    }
}
