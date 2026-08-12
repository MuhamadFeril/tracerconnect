<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobVacancy\StoreJobVacancyRequest;
use App\Http\Requests\JobVacancy\UpdateJobVacancyRequest;
use App\Http\Resources\JobVacancyResource;
use App\Models\JobVacancy;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class JobVacancyController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', JobVacancy::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $vacancies = JobVacancy::query()
            ->when(! $currentUser->hasRole('super_admin'), fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->hasRole('super_admin') && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->when($currentUser->hasRole('alumni'), fn ($query) => $query->visibleToAlumni($currentUser->institution_id))
            // Career center flags: alumni see whether they saved/applied;
            // staff see how many applicants a vacancy has.
            ->when($currentUser->hasRole('alumni'), fn ($query) => $query->withExists([
                'savedBy as is_saved' => fn ($q) => $q->where('user_id', $currentUser->id),
                'applications as has_applied' => fn ($q) => $q->where('applicant_id', $currentUser->id),
            ]))
            ->when(! $currentUser->hasRole('alumni'), fn ($query) => $query->withCount('applications'))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->search);
                $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('company_name', 'like', "%{$search}%"));
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('employment_type'), fn ($query) => $query->where('employment_type', $request->employment_type))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success(
            JobVacancyResource::collection($vacancies->items()),
            'Data lowongan kerja berhasil diambil',
            ApiResponse::paginationMeta($vacancies)
        );
    }

    public function store(StoreJobVacancyRequest $request)
    {
        $data = $request->validated();

        $vacancy = JobVacancy::create([...$data, 'created_by' => $request->user()->id]);

        if ($vacancy->status === 'published') {
            NotificationService::notifyAlumni(
                $vacancy->institution_id,
                'Lowongan kerja baru',
                $vacancy->title.' — '.$vacancy->company_name,
                '/lowongan',
                'job'
            );
        }

        return ApiResponse::success(new JobVacancyResource($vacancy), 'Lowongan kerja berhasil dibuat', [], 201);
    }

    public function show(JobVacancy $jobVacancy)
    {
        $this->authorize('view', $jobVacancy);

        return ApiResponse::success(new JobVacancyResource($jobVacancy), 'Data lowongan kerja berhasil diambil');
    }

    public function update(UpdateJobVacancyRequest $request, JobVacancy $jobVacancy)
    {
        $this->authorize('update', $jobVacancy);

        $wasPublished = $jobVacancy->status === 'published';
        $jobVacancy->update($request->validated());

        if ($jobVacancy->status === 'published' && ! $wasPublished) {
            NotificationService::notifyAlumni(
                $jobVacancy->institution_id,
                'Lowongan kerja baru',
                $jobVacancy->title.' — '.$jobVacancy->company_name,
                '/lowongan',
                'job'
            );
        }

        return ApiResponse::success(new JobVacancyResource($jobVacancy->fresh()), 'Lowongan kerja berhasil diperbarui');
    }

    public function destroy(JobVacancy $jobVacancy)
    {
        $this->authorize('delete', $jobVacancy);

        $jobVacancy->delete();

        return ApiResponse::success([], 'Lowongan kerja berhasil dihapus');
    }
}
