<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnnouncementResource;
use App\Http\Resources\EventResource;
use App\Http\Resources\JobVacancyResource;
use App\Models\Alumni;
use App\Models\Announcement;
use App\Models\Event;
use App\Models\JobVacancy;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlumniPortalController extends Controller
{
    /**
     * Alumni home feed: latest published announcements, upcoming events,
     * and job vacancies — strictly scoped to the user's own institution.
     * Users without an institution receive empty lists (no data leak).
     */
    public function home(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $institutionId = $user->institution_id;

        $announcements = Announcement::query()
            ->visibleToAlumni($institutionId)
            ->orderByDesc('published_at')
            ->limit(3)
            ->get();

        $events = Event::query()
            ->visibleToAlumni($institutionId)
            ->where('starts_at', '>=', now())
            ->orderBy('starts_at')
            ->limit(3)
            ->get();

        $jobs = JobVacancy::query()
            ->visibleToAlumni($institutionId)
            ->orderByDesc('posted_at')
            ->limit(3)
            ->get();

        $alumni = Alumni::query()
            ->with('department:id,name', 'graduationYear:id,year')
            ->where('user_id', $user->id)
            ->first();

        return ApiResponse::success([
            'institution' => $user->institution ? ['id' => $user->institution->id, 'name' => $user->institution->name] : null,

            'alumni' => $alumni ? [
                'id' => $alumni->id,
                'name' => $alumni->name,
                'nis_nim' => $alumni->nis_nim,
                'department' => $alumni->department?->name,
                'graduation_year' => $alumni->graduationYear?->year,
                'birthplace_label' => $alumni->birthplace_label,
                'employment_status' => $alumni->employment_status,
                'company_name' => $alumni->company_name,
                'position' => $alumni->position,
                'business_field' => $alumni->business_field,
                'business_start_year' => $alumni->business_start_year,
                'location' => $alumni->location,
                'work_province' => $alumni->work_province,
                'work_city' => $alumni->work_city,
                'study_institution' => $alumni->study_institution,
                'study_program' => $alumni->study_program,
                'study_entry_year' => $alumni->study_entry_year,
                'business_name' => $alumni->business_name,
                'business_address' => $alumni->business_address,
                'business_province' => $alumni->business_province,
                'business_city' => $alumni->business_city,
            ] : null,
            'announcements' => AnnouncementResource::collection($announcements),
            'events' => EventResource::collection($events),
            'jobs' => JobVacancyResource::collection($jobs),
        ], 'Beranda alumni berhasil dimuat');
    }

    /**
     * Surveys currently available for the alumni to fill: published, not
     * started-yet / not expired — scoped to their own institution, each
     * with the respondent's current status (not_started / in_progress /
     * submitted / expired) and completion percentage.
     */
    public function surveys(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $institutionId = $user->institution_id;

        if (! $institutionId) {
            return ApiResponse::success([], 'Daftar survey berhasil diambil');
        }

        $surveys = Survey::query()
            ->withCount('questions')
            ->forInstitution($institutionId)
            ->where('status', 'published')
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->orderByDesc('published_at')
            ->get();

        $myResponses = SurveyResponse::query()
            ->withCount('answers')
            ->where('respondent_id', $user->id)
            ->whereIn('survey_id', $surveys->pluck('id'))
            ->get()
            ->keyBy('survey_id');

        $data = $surveys->map(function (Survey $survey) use ($myResponses) {
            $response = $myResponses->get($survey->id);

            if (! $response) {
                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'version' => $survey->version,
                    'expires_at' => $survey->expires_at,
                    'questions_count' => $survey->questions_count,
                    'response' => ['status' => 'not_started', 'completion' => null],
                ];
            }

            $status = $response->status;
            if ($status === 'in_progress' && $survey->expires_at?->isPast()) {
                $status = 'expired';
            }

            $total = (int) $survey->questions_count;
            $answered = (int) $response->answers_count;

            return [
                'id' => $survey->id,
                'title' => $survey->title,
                'description' => $survey->description,
                'version' => $survey->version,
                'expires_at' => $survey->expires_at,
                'questions_count' => $total,
                'response' => [
                    'id' => $response->id,
                    'status' => $status,
                    'completion' => $total === 0 ? 0 : min(100, (int) round($answered / $total * 100)),
                ],
            ];
        })->values();

        return ApiResponse::success($data, 'Daftar survey berhasil diambil');
    }
}
