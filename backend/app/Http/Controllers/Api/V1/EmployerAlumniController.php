<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Alumni;
use App\Models\JobApplication;
use App\Models\JobVacancy;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EmployerAlumniController extends Controller
{
    /**
     * Browse/search alumni who have applied to the employer's job vacancies.
     * IDOR fix: scoped to only alumni with applications on the employer's jobs.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->hasRole('employer')) {
            return ApiResponse::error('Hanya employer yang dapat mengakses fitur ini', [], 403);
        }

        $perPage = max(1, min($request->integer('per_page', 20), 50));
        $employerId = $request->user()->id;

        $alumni = Alumni::query()
            ->with([
                'department:id,name',
                'graduationYear:id,year',
            ])
            // IDOR fix: only show alumni who applied to this employer's jobs
            ->whereHas('user.jobApplications.vacancy', fn ($q) => $q->where('created_by', $employerId))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = addcslashes(trim((string) $request->search), '%_\\\\');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%")
                        ->orWhere('position', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->department_id))
            ->when($request->filled('graduation_year_id'), fn ($q) => $q->where('graduation_year_id', $request->graduation_year_id))
            ->when($request->filled('employment_status'), fn ($q) => $q->where('employment_status', $request->employment_status))
            ->orderBy('name')
            ->paginate($perPage);

        return ApiResponse::success(
            $alumni->through(fn (Alumni $a) => [
                'id' => $a->id,
                'name' => $a->name,
                'email' => $a->email,
                'phone' => $a->phone,
                'gender' => $a->gender,
                'department' => $a->department?->name,
                'graduation_year' => $a->graduationYear?->year,
                'employment_status' => $a->employment_status,
                'company_name' => $a->company_name,
                'position' => $a->position,
                'location' => $a->location,
                'skills' => $a->skills,
            ]),
            'Daftar alumni berhasil diambil',
            ApiResponse::paginationMeta($alumni)
        );
    }

    /**
     * Detailed alumni profile for the employer.
     * IDOR fix: only viewable if the alumni applied to the employer's jobs.
     */
    public function show(Request $request, string $alumniId): JsonResponse
    {
        if (! $request->user()->hasRole('employer')) {
            return ApiResponse::error('Hanya employer yang dapat mengakses fitur ini', [], 403);
        }

        $alumni = Alumni::with([
            'department:id,name',
            'graduationYear:id,year',
            'user:id,name,email,avatar_path',
        ])->find($alumniId);

        if (! $alumni) {
            return ApiResponse::error('Alumni tidak ditemukan', [], 404);
        }

        // IDOR fix: verify this alumni applied to one of the employer's jobs
        $hasApplication = JobApplication::query()
            ->where('alumni_id', $alumni->id)
            ->whereHas('vacancy', fn ($q) => $q->where('created_by', $request->user()->id))
            ->exists();

        if (! $hasApplication) {
            return ApiResponse::error('Anda tidak memiliki akses ke profil ini', [], 403);
        }

        return ApiResponse::success([
            'id' => $alumni->id,
            'name' => $alumni->name,
            'email' => $alumni->email,
            'phone' => $alumni->phone,
            'gender' => $alumni->gender,
            'birth_date' => $alumni->birth_date?->toDateString(),
            'birthplace_label' => $alumni->birthplace_label,
            'address' => $alumni->address,
            'department' => $alumni->department?->name,
            'graduation_year' => $alumni->graduationYear?->year,
            'employment_status' => $alumni->employment_status,
            'company_name' => $alumni->company_name,
            'position' => $alumni->position,
            'location' => $alumni->location,
            'work_city' => $alumni->work_city,
            'work_province' => $alumni->work_province,
            'business_name' => $alumni->business_name,
            'business_field' => $alumni->business_field,
            'business_address' => $alumni->business_address,
            'study_institution' => $alumni->study_institution,
            'study_program' => $alumni->study_program,
            'skills' => $alumni->skills,
            'socials' => $alumni->socials,
            'avatar_url' => $alumni->user?->avatar_path
                ? url('storage/'.$alumni->user->avatar_path)
                : null,
        ], 'Detail alumni berhasil diambil');
    }

    /**
     * Download CV from a job application.
     */
    public function downloadApplicationCv(Request $request, string $applicationId)
    {
        if (! $request->user()->hasRole('employer')) {
            return ApiResponse::error('Hanya employer yang dapat mengakses fitur ini', [], 403);
        }

        $application = \App\Models\JobApplication::with('vacancy')
            ->where('id', $applicationId)
            ->whereHas('vacancy', fn ($q) => $q->where('created_by', $request->user()->id))
            ->first();

        if (! $application || ! $application->cv_path) {
            return ApiResponse::error('CV tidak ditemukan', [], 404);
        }

        $path = $application->cv_path;

        if (! Storage::disk('public')->exists($path)) {
            return ApiResponse::error('File CV tidak ditemukan di server', [], 404);
        }

        return response()->download(
            Storage::disk('public')->path($path),
            basename($path),
            ['Content-Type' => Storage::disk('public')->mimeType($path)]
        );
    }
}
