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
            ->when($currentUser->hasRole('super_admin'), function ($query) use ($request) {
                $query->when($request->filled('institution_id'), fn ($q) => $q->where('institution_id', $request->institution_id));
            })
            // HRDs see the vacancies they created, wherever they are
            // announced (their own are cross-school).
            ->when($currentUser->hasRole('hrd'), fn ($query) => $query->where('created_by', $currentUser->id))
            // Alumni see published vacancies from their own school plus the
            // cross-school vacancies posted by hrd.
            ->when($currentUser->hasRole('alumni'), function ($query) use ($currentUser) {
                $query->where('status', 'published')
                    ->where(fn ($q) => $q->whereNull('institution_id')->orWhere('institution_id', $currentUser->institution_id));
            })
            // Institution staff see their own vacancies plus the published
            // cross-school ones announced to their alumni.
            ->when(! $currentUser->hasAnyRole(['super_admin', 'hrd', 'alumni']), function ($query) use ($currentUser) {
                $query->where(fn ($q) => $q->where('institution_id', $currentUser->institution_id)
                    ->orWhere(fn ($q2) => $q2->whereNull('institution_id')->where('status', 'published')));
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = addcslashes(trim((string) $request->search), '%_\\');
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
        $this->authorize('create', JobVacancy::class);

        $data = $this->withHrdCompany($request, $request->validated());

        $vacancy = JobVacancy::create([...$data, 'created_by' => $request->user()->id]);

        if ($vacancy->status === 'published') {
            $this->notifyAboutVacancy($vacancy);
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

        $data = $this->withHrdCompany($request, $request->validated());

        $wasPublished = $jobVacancy->status === 'published';
        $jobVacancy->update($data);

        if ($jobVacancy->status === 'published' && ! $wasPublished) {
            $this->notifyAboutVacancy($jobVacancy);
        }

        return ApiResponse::success(new JobVacancyResource($jobVacancy->fresh()), 'Lowongan kerja berhasil diperbarui');
    }

    public function destroy(JobVacancy $jobVacancy)
    {
        $this->authorize('delete', $jobVacancy);

        $jobVacancy->delete();

        return ApiResponse::success([], 'Lowongan kerja berhasil dihapus');
    }

    /**
     * HRD vacancies always carry the HRD account's company (PT) name, so the
     * company shown on a vacancy can never drift from the recruiter's own
     * company. The form only lets HRD type a company when their account has
     * none yet (legacy accounts); once set, it is enforced here server-side
     * and the submitted name is adopted as the account's PT.
     */
    private function withHrdCompany(Request $request, array $data): array
    {
        $user = $request->user();

        if (! $user->hasRole('hrd')) {
            return $data;
        }

        if ($user->company_name) {
            $data['company_name'] = $user->company_name;
        } elseif (! empty($data['company_name'])) {
            // Legacy HRD accounts without a PT yet: adopt the first
            // submitted name so the account is bound from then on.
            $user->update(['company_name' => $data['company_name']]);
        }

        return $data;
    }

    /**
     * Broadcast a newly published vacancy: to every school when it is
     * cross-school (hrd-posted), otherwise to the owning institution.
     */
    private function notifyAboutVacancy(JobVacancy $vacancy): void
    {
        if ($vacancy->institution_id === null) {
            NotificationService::notifyAllAlumni(
                'Lowongan kerja baru',
                $vacancy->title.' — '.$vacancy->company_name,
                '/lowongan',
                'job'
            );

            return;
        }

        NotificationService::notifyAlumni(
            $vacancy->institution_id,
            'Lowongan kerja baru',
            $vacancy->title.' — '.$vacancy->company_name,
            '/lowongan',
            'job'
        );
    }
}
