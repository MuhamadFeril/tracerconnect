<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\JobApplicationResource;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

/**
 * Self-service endpoints for the hrd portal: hrd manage their own
 * vacancies and applicants without going through institution staff/admin.
 */
class HrdController extends Controller
{
    /**
     * Check if the user has an HRD-compatible role.
     * Handles both the current 'hrd' role and the legacy 'employer' role
     * for databases where the rename migration hasn't been run yet.
     */
    private function isHrd($user): bool
    {
        return $user->hasAnyRole(['hrd', 'employer', 'admin_institusi']);
    }

    /**
     * Dashboard summary for the authenticated hrd: their own vacancy
     * counts, applicant totals per hiring stage, and recent activity.
     */
    public function dashboard(Request $request)
    {
        if (! $this->isHrd($request->user())) {
            return ApiResponse::error('Hanya HRD yang dapat mengakses fitur ini', [], 403);
        }

        $hrdId = $request->user()->id;

        $vacancyStats = JobVacancy::query()
            ->where('created_by', $hrdId)
            ->selectRaw("count(*) as total")
            ->selectRaw("sum(case when status = 'published' then 1 else 0 end) as published")
            ->selectRaw("sum(case when status = 'draft' then 1 else 0 end) as draft")
            ->selectRaw("sum(case when status = 'closed' then 1 else 0 end) as closed")
            ->first();

        // Withdrawn applications left the process by the applicant's own
        // choice — keep them out of the hrd's review inbox/stats.
        $applicationsQuery = JobApplication::query()
            ->whereHas('vacancy', fn ($q) => $q->where('created_by', $hrdId))
            ->where('status', '!=', 'withdrawn');

        $statusCounts = (clone $applicationsQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $totalApplicants = (clone $applicationsQuery)->count();
        $newApplicants = (int) ($statusCounts['submitted'] ?? 0);
        $acceptedApplicants = (int) ($statusCounts['accepted'] ?? 0);

        $recentApplications = (clone $applicationsQuery)
            ->with(['vacancy:id,title,company_name,employment_type,location,status', 'alumni.department:id,name', 'alumni.graduationYear:id,year'])
            ->orderByDesc('applied_at')
            ->limit(5)
            ->get();

        $myVacancies = JobVacancy::query()
            ->where('created_by', $hrdId)
            ->withCount(['applications as applicants_count' => fn ($q) => $q->where('status', '!=', 'withdrawn')])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get();

        return ApiResponse::success([
            'vacancies' => [
                'total' => (int) ($vacancyStats->total ?? 0),
                'published' => (int) ($vacancyStats->published ?? 0),
                'draft' => (int) ($vacancyStats->draft ?? 0),
                'closed' => (int) ($vacancyStats->closed ?? 0),
            ],
            'applications' => [
                'total' => $totalApplicants,
                'new' => $newApplicants,
                'reviewing' => (int) ($statusCounts['reviewing'] ?? 0),
                'shortlisted' => (int) ($statusCounts['shortlisted'] ?? 0),
                'interview' => (int) ($statusCounts['interview'] ?? 0),
                'accepted' => $acceptedApplicants,
                'rejected' => (int) ($statusCounts['rejected'] ?? 0),
            ],
            'recent_applications' => $recentApplications,
            'my_vacancies' => $myVacancies,
        ], 'Data dashboard HRD berhasil diambil');
    }

    /**
     * All applications across the hrd's own vacancies — a unified inbox
     * so the hrd reviews applicants in one place instead of visiting
     * each vacancy through the admin panel.
     */
    public function applications(Request $request)
    {
        if (! $this->isHrd($request->user())) {
            return ApiResponse::error('Hanya HRD yang dapat mengakses fitur ini', [], 403);
        }

        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $applications = JobApplication::query()
            ->whereHas('vacancy', function ($query) use ($request) {
                $query->where('created_by', $request->user()->id);

                // Optional per-vacancy filter.
                $query->when($request->filled('job_vacancy_id'), fn ($q) => $q->where('id', $request->string('job_vacancy_id')));
            })
            // Withdrawn applications left the process by the applicant's own
            // choice — keep them out of the hrd's review inbox.
            ->where('status', '!=', 'withdrawn')
            ->with(['vacancy:id,title,company_name,employment_type,location,status', 'alumni.department:id,name', 'alumni.graduationYear:id,year'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = addcslashes(trim((string) $request->search), '%_\\');
                $query->where(fn ($q) => $q
                    ->whereHas('alumni', fn ($a) => $a->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('vacancy', fn ($v) => $v->where('title', 'like', "%{$search}%")));
            })
            ->orderByDesc('applied_at')
            ->paginate($perPage);

        return ApiResponse::success(
            JobApplicationResource::collection($applications->items()),
            'Data lamaran berhasil diambil',
            ApiResponse::paginationMeta($applications)
        );
    }
}
