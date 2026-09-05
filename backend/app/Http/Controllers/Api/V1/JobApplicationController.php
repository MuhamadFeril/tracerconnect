<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobApplication\ApplyJobRequest;
use App\Http\Requests\JobApplication\UpdateAcceptanceRequest;
use App\Http\Requests\JobApplication\UpdateApplicationStatusRequest;
use App\Http\Resources\JobApplicationResource;
use App\Models\JobAcceptance;
use App\Models\JobApplication;
use App\Models\JobBookmark;
use App\Models\JobVacancy;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class JobApplicationController extends Controller
{
    /**
     * The authenticated user's applications (alumni portal).
     */
    public function my(Request $request)
    {
        $this->authorize('viewAny', JobApplication::class);

        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $applications = JobApplication::query()
            ->where('user_id', $request->user()->id)
            ->with('vacancy:id,title,company_name,employment_type,location,status', 'alumni.department:id,name', 'alumni.graduationYear:id,year')
            ->orderByDesc('applied_at')
            ->paginate($perPage);

        return ApiResponse::success(
            JobApplicationResource::collection($applications->items()),
            'Data lamaran berhasil diambil',
            ApiResponse::paginationMeta($applications)
        );
    }

    /**
     * Applications for a vacancy (institution staff / hrd view).
     */
    public function index(Request $request, JobVacancy $jobVacancy)
    {
        $this->authorize('viewAny', JobApplication::class);

        // Only the job creator (hrd), staff of the vacancy's
        // institution, or a super admin may list its applicants.
        $currentUser = $request->user();
        $isCreator = $jobVacancy->created_by === $currentUser->id;
        $isStaff = $jobVacancy->institution_id !== null && $currentUser->institution_id === $jobVacancy->institution_id;
        if (! $currentUser->hasRole('super_admin') && ! $isCreator && ! $isStaff) {
            return ApiResponse::error('Anda tidak berhak mengakses data ini', [], 403);
        }

        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $applications = $jobVacancy->applications()
            ->with('alumni.department:id,name', 'alumni.graduationYear:id,year', 'acceptance')
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->orderByDesc('applied_at')
            ->paginate($perPage);

        return ApiResponse::success(
            JobApplicationResource::collection($applications->items()),
            'Data pelamar berhasil diambil',
            ApiResponse::paginationMeta($applications)
        );
    }

    public function show(Request $request, JobApplication $application)
    {
        $this->authorize('view', $application);

        $application->load('vacancy:id,title,company_name,employment_type,location,status', 'alumni.department:id,name', 'alumni.graduationYear:id,year', 'acceptance');

        return ApiResponse::success(new JobApplicationResource($application), 'Data lamaran berhasil diambil');
    }

    /**
     * Apply to a vacancy (alumni portal).
     */
    public function apply(ApplyJobRequest $request, JobVacancy $jobVacancy)
    {
        $this->authorize('create', JobApplication::class);

        $user = $request->user();

        // Only active, published vacancies may be applied to: tenant-scoped
        // ones by alumni of that school, and cross-school hrd vacancies
        // by alumni of any school.
        $institutionMatches = $jobVacancy->institution_id === null || $jobVacancy->institution_id === $user->institution_id;
        if ($jobVacancy->status !== 'published' || ! $institutionMatches) {
            return ApiResponse::error('Lowongan tidak tersedia untuk dilamar', [], 422);
        }

        if ($user->jobApplications()->where('job_vacancy_id', $jobVacancy->id)->exists()) {
            return ApiResponse::error('Anda sudah melamar lowongan ini', [], 422);
        }

        $data = $request->validated();

        $cvPath = $data['cv'] ?? null
            ? $request->file('cv')->store('applications/cv', 'public')
            : null;
        $portfolioPath = $data['portfolio'] ?? null
            ? $request->file('portfolio')->store('applications/portfolio', 'public')
            : null;

        $application = $user->jobApplications()->create([
            'job_vacancy_id' => $jobVacancy->id,
            'alumni_id' => $user->alumni?->id,
            'status' => 'submitted',
            'cover_letter' => $data['cover_letter'] ?? null,
            'cv_data' => $data['cv_data'] ?? null,
            'cv_path' => $cvPath,
            'portfolio_path' => $portfolioPath,
            'applied_at' => now(),
        ]);

        $application->load('vacancy:id,title,company_name,employment_type,location,status', 'alumni.department:id,name', 'alumni.graduationYear:id,year');

        return ApiResponse::success(new JobApplicationResource($application), 'Lamaran berhasil dikirim', [], 201);
    }

    /**
     * Withdraw the authenticated user's own application.
     */
    public function withdraw(Request $request, JobApplication $application)
    {
        $this->authorize('update', $application);

        if ($application->user_id !== $request->user()->id) {
            return ApiResponse::error('Anda tidak berhak mengubah lamaran ini', [], 403);
        }

        if (in_array($application->status, ['accepted', 'rejected', 'withdrawn'], true)) {
            return ApiResponse::error('Lamaran tidak dapat ditarik pada status saat ini', [], 422);
        }

        $application->update(['status' => 'withdrawn']);

        return ApiResponse::success(new JobApplicationResource($application), 'Lamaran berhasil ditarik');
    }

    /**
     * Update application status (institution staff / hrd).
     */
    public function updateStatus(UpdateApplicationStatusRequest $request, JobApplication $application)
    {
        $this->authorize('update', $application);

        // Only the job creator (hrd), staff of the vacancy's
        // institution, or a super admin may change the status.
        $currentUser = $request->user();
        $vacancy = $application->vacancy;
        $isCreator = $vacancy?->created_by === $currentUser->id;
        $isStaff = $vacancy?->institution_id !== null && $currentUser->institution_id === $vacancy->institution_id;
        if (! $currentUser->hasRole('super_admin') && ! $isCreator && ! $isStaff) {
            return ApiResponse::error('Anda tidak berhak mengubah lamaran ini', [], 403);
        }

        if ($application->status === 'withdrawn') {
            return ApiResponse::error('Lamaran yang ditarik tidak dapat diubah statusnya', [], 422);
        }

        $application->update(['status' => $request->status]);

        // Notify the applicant about the status change.
        NotificationService::notifyUser(
            $application->user,
            'Pembaruan lamaran',
            "Lamaran Anda untuk '{$application->vacancy?->title}' berstatus {$request->status}.",
            '/applications',
            'job'
        );

        $application->load('vacancy:id,title,company_name,employment_type,location,status', 'alumni.department:id,name', 'alumni.graduationYear:id,year');

        return ApiResponse::success(new JobApplicationResource($application), 'Status lamaran berhasil diperbarui');
    }

    /**
     * Record (or update) the hiring result of an accepted application — the
     * "hasil penerimaan lowongan": offered position, contract type, start
     * date, salary, and notes. Only the job creator (hrd), staff of the
     * vacancy's institution, or a super admin may fill it, and only while the
     * application is accepted.
     */
    public function saveAcceptance(UpdateAcceptanceRequest $request, JobApplication $application)
    {
        $this->authorize('update', $application);

        // Only the job creator (hrd), staff of the vacancy's
        // institution, or a super admin may record the result.
        $currentUser = $request->user();
        $vacancy = $application->vacancy;
        $isCreator = $vacancy?->created_by === $currentUser->id;
        $isStaff = $vacancy?->institution_id !== null && $currentUser->institution_id === $vacancy->institution_id;
        if (! $currentUser->hasRole('super_admin') && ! $isCreator && ! $isStaff) {
            return ApiResponse::error('Anda tidak berhak mengubah lamaran ini', [], 403);
        }

        if ($application->status !== 'accepted') {
            return ApiResponse::error('Data penerimaan hanya dapat diisi saat lamaran berstatus diterima', [], 422);
        }

        $data = $request->validated();

        $acceptance = JobAcceptance::updateOrCreate(
            ['job_application_id' => $application->id],
            [
                'job_vacancy_id' => $application->job_vacancy_id,
                'alumni_id' => $application->alumni_id,
                'position_offered' => $data['position_offered'] ?? null,
                'contract_type' => $data['contract_type'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'salary' => $data['salary'] ?? null,
                'notes' => $data['notes'] ?? null,
                'decided_by' => $currentUser->id,
                'decided_at' => now(),
            ]
        );

        $application->load('vacancy:id,title,company_name,employment_type,location,status', 'alumni.department:id,name', 'alumni.graduationYear:id,year', 'acceptance');

        return ApiResponse::success(new JobApplicationResource($application), 'Data penerimaan lowongan berhasil disimpan');
    }

    /**
     * Bookmark a vacancy (alumni portal).
     */
    public function bookmark(Request $request, JobVacancy $jobVacancy)
    {
        $this->authorize('view', $jobVacancy);

        $user = $request->user();

        if (! $user->jobBookmarks()->where('job_vacancy_id', $jobVacancy->id)->exists()) {
            $user->jobBookmarks()->create(['job_vacancy_id' => $jobVacancy->id]);
        }

        return ApiResponse::success(['bookmarked' => true], 'Lowongan disimpan');
    }

    /**
     * Remove a bookmark (alumni portal).
     */
    public function unbookmark(Request $request, JobVacancy $jobVacancy)
    {
        $this->authorize('view', $jobVacancy);

        JobBookmark::query()
            ->where('job_vacancy_id', $jobVacancy->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return ApiResponse::success(['bookmarked' => false], 'Lowongan dihapus dari simpanan');
    }
}
