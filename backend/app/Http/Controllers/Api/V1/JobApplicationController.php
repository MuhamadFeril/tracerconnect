<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\JobApplication\ApplyJobRequest;
use App\Http\Requests\JobApplication\UpdateJobApplicationStatusRequest;
use App\Http\Resources\JobApplicationResource;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Models\User;
use App\Notifications\InAppNotification;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    /**
     * Staff list of applications, scoped to the caller's institution
     * (filterable by vacancy, status, and applicant search).
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', JobApplication::class);

        /** @var User $user */
        $user = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $applications = JobApplication::query()
            ->with(['jobVacancy', 'applicant'])
            ->when(! $user->hasRole('super_admin'), fn ($query) => $query->whereHas(
                'jobVacancy',
                fn ($job) => $job->forInstitution($user->institution_id)
            ))
            ->when($request->filled('job_vacancy_id'), fn ($query) => $query->where('job_vacancy_id', $request->job_vacancy_id))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->search);
                $query->whereHas('applicant', fn ($userQuery) => $userQuery
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"));
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success(
            JobApplicationResource::collection($applications->items()),
            'Data lamaran berhasil diambil',
            ApiResponse::paginationMeta($applications)
        );
    }

    /**
     * The alumni's own applications (career center "Lamaran Saya").
     */
    public function my(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $applications = JobApplication::query()
            ->with('jobVacancy')
            ->where('applicant_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success(
            JobApplicationResource::collection($applications->items()),
            'Daftar lamaran berhasil diambil',
            ApiResponse::paginationMeta($applications)
        );
    }

    /**
     * Submit an application for a vacancy. Applying twice is idempotent —
     * the existing application is returned instead of a duplicate.
     */
    public function apply(ApplyJobRequest $request, JobVacancy $jobVacancy): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $existing = JobApplication::query()
            ->where('job_vacancy_id', $jobVacancy->id)
            ->where('applicant_id', $user->id)
            ->first();

        if ($existing) {
            return ApiResponse::success(
                new JobApplicationResource($existing->load('jobVacancy')),
                'Anda sudah melamar lowongan ini',
                [],
                200
            );
        }

        $application = JobApplication::create([
            'job_vacancy_id' => $jobVacancy->id,
            'applicant_id' => $user->id,
            'message' => $request->validated('message'),
            'status' => 'pending',
        ]);

        NotificationService::notifyStaff(
            $jobVacancy->institution_id,
            'Lamaran masuk',
            $user->name.' melamar '.$jobVacancy->title.' — '.$jobVacancy->company_name,
            '/applications',
            'info'
        );

        return ApiResponse::success(
            new JobApplicationResource($application->load('jobVacancy')),
            'Lamaran berhasil dikirim',
            [],
            201
        );
    }

    /**
     * Staff review: move an application to reviewed/accepted/rejected and
     * notify the applicant of the outcome.
     */
    public function updateStatus(UpdateJobApplicationStatusRequest $request, JobApplication $jobApplication): JsonResponse
    {
        $jobApplication->update(['status' => $request->validated('status')]);

        $statusLabels = [
            'pending' => 'menunggu review',
            'reviewed' => 'ditinjau',
            'accepted' => 'diterima',
            'rejected' => 'ditolak',
            'cancelled' => 'dibatalkan',
        ];
        $label = $statusLabels[$jobApplication->status] ?? $jobApplication->status;

        $jobApplication->applicant?->notify(new InAppNotification(
            'Status lamaran diperbarui',
            sprintf(
                'Lamaran Anda untuk "%s" kini berstatus %s.',
                $jobApplication->jobVacancy?->title ?? 'lowongan',
                $label
            ),
            '/lamaran',
            'job'
        ));

        return ApiResponse::success(
            new JobApplicationResource($jobApplication->load(['jobVacancy', 'applicant'])),
            'Status lamaran berhasil diperbarui'
        );
    }

    /**
     * The applicant withdraws their own application (or staff removes it).
     */
    public function destroy(Request $request, JobApplication $jobApplication): JsonResponse
    {
        $this->authorize('delete', $jobApplication);

        $jobApplication->delete();

        return ApiResponse::success([], 'Lamaran berhasil dibatalkan');
    }
}
