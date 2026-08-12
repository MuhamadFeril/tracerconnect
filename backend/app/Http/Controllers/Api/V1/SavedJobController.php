<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SavedJobResource;
use App\Models\JobVacancy;
use App\Models\SavedJob;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedJobController extends Controller
{
    /**
     * The caller's bookmarked vacancies.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SavedJob::class);

        /** @var User $user */
        $user = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $savedJobs = SavedJob::query()
            ->with('jobVacancy')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success(
            SavedJobResource::collection($savedJobs->items()),
            'Daftar lowongan tersimpan berhasil diambil',
            ApiResponse::paginationMeta($savedJobs)
        );
    }

    /**
     * Bookmark a vacancy (idempotent — saving twice keeps one bookmark).
     */
    public function store(Request $request, JobVacancy $jobVacancy): JsonResponse
    {
        // Explicit policy target: SavedJobPolicy::create($user, $jobVacancy).
        $this->authorize('create', [SavedJob::class, $jobVacancy]);

        /** @var User $user */
        $user = $request->user();

        $saved = SavedJob::query()
            ->where('job_vacancy_id', $jobVacancy->id)
            ->where('user_id', $user->id)
            ->first();

        if ($saved) {
            return ApiResponse::success(
                new SavedJobResource($saved->load('jobVacancy')),
                'Lowongan sudah tersimpan',
                [],
                200
            );
        }

        $saved = SavedJob::create([
            'job_vacancy_id' => $jobVacancy->id,
            'user_id' => $user->id,
        ]);

        return ApiResponse::success(
            new SavedJobResource($saved->load('jobVacancy')),
            'Lowongan berhasil disimpan',
            [],
            201
        );
    }

    /**
     * Remove a bookmark by vacancy (idempotent — missing bookmark is fine).
     */
    public function destroy(Request $request, JobVacancy $jobVacancy): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $saved = SavedJob::query()
            ->where('job_vacancy_id', $jobVacancy->id)
            ->where('user_id', $user->id)
            ->first();

        if ($saved) {
            $this->authorize('delete', $saved);
            $saved->delete();
        }

        return ApiResponse::success([], 'Lowongan dihapus dari daftar tersimpan');
    }
}
