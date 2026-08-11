<?php

namespace App\Services;

use App\Models\Alumni;
use App\Models\Question;
use App\Models\Survey;
use App\Models\SurveyAnswer;
use App\Models\SurveyResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Tenant-scoped analytics computations shared by the analytics endpoints and
 * the reporting module (phase 6 + phase 7).
 */
class AnalyticsService
{
    /**
     * Dashboard summary (total alumni, respondents, rates, distributions).
     *
     * @return array<string, mixed>
     */
    public function overview(Request $request): array
    {
        $alumniQuery = $this->alumniQuery($request);
        $responsesQuery = $this->responsesQuery($request);

        $totalAlumni = (clone $alumniQuery)->count();

        $totalRespondents = (clone $responsesQuery)
            ->where('status', 'submitted')
            ->distinct()
            ->count('respondent_id');

        $responseRate = $totalAlumni > 0 ? round($totalRespondents / $totalAlumni * 100, 1) : 0;

        $employment = $this->employmentDistribution(clone $alumniQuery);
        $rate = fn (string $status) => $totalAlumni > 0
            ? round(($employment->firstWhere('status', $status)['count'] ?? 0) / $totalAlumni * 100, 1)
            : 0;

        $alumniPerYear = (clone $alumniQuery)
            ->join('graduation_years', 'graduation_years.id', '=', 'alumni.graduation_year_id')
            ->selectRaw('graduation_years.year as year, count(*) as count')
            ->groupBy('graduation_years.year')
            ->orderBy('graduation_years.year')
            ->get()
            ->map(fn ($row) => ['year' => (int) $row->year, 'count' => (int) $row->count])
            ->values();

        $responsesPerSurvey = (clone $responsesQuery)
            ->where('survey_responses.status', 'submitted')
            ->join('surveys', 'surveys.id', '=', 'survey_responses.survey_id')
            ->selectRaw('surveys.title as title, count(*) as count')
            ->groupBy('surveys.title')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['title' => $row->title, 'count' => (int) $row->count])
            ->values();

        $recentResponses = (clone $responsesQuery)
            ->where('status', 'submitted')
            ->with(['respondent:id,name', 'survey:id,title'])
            ->orderByDesc('submitted_at')
            ->limit(5)
            ->get()
            ->map(fn ($response) => [
                'id' => $response->id,
                'respondent' => $response->respondent?->name ?? '—',
                'survey' => $response->survey?->title ?? '—',
                'submitted_at' => $response->submitted_at,
            ])
            ->values();

        return [
            'total_alumni' => $totalAlumni,
            'total_respondents' => $totalRespondents,
            'response_rate' => $responseRate,
            'employment_rate' => $rate('working'),
            'entrepreneurship_rate' => $rate('entrepreneur'),
            'continuing_study_rate' => $rate('continuing_study'),
            'unemployed_rate' => $rate('unemployed'),
            'employment_distribution' => $employment,
            'alumni_per_year' => $alumniPerYear,
            'responses_per_survey' => $responsesPerSurvey,
            'recent_responses' => $recentResponses,
        ];
    }

    /**
     * Employment breakdown with graduation-year and department comparisons.
     *
     * @return array<string, mixed>
     */
    public function employment(Request $request): array
    {
        $alumniQuery = $this->alumniQuery($request);

        $distribution = $this->employmentDistribution(clone $alumniQuery);

        $byYear = (clone $alumniQuery)
            ->join('graduation_years', 'graduation_years.id', '=', 'alumni.graduation_year_id')
            ->selectRaw(
                'graduation_years.year as year, COALESCE(NULLIF(alumni.employment_status, \'\'), \'unknown\') as status, count(*) as count'
            )
            ->groupBy('graduation_years.year', 'status')
            ->orderBy('graduation_years.year')
            ->get()
            ->groupBy('year')
            ->map(fn ($rows, $year) => $this->statusRow(['year' => (int) $year], $rows))
            ->values();

        $byDepartment = (clone $alumniQuery)
            ->leftJoin('departments', 'departments.id', '=', 'alumni.department_id')
            ->whereNull('departments.deleted_at')
            ->selectRaw(
                "COALESCE(departments.name, 'Tanpa Jurusan') as department, COALESCE(NULLIF(alumni.employment_status, ''), 'unknown') as status, count(*) as count"
            )
            ->groupBy('department', 'status')
            ->orderBy('department')
            ->get()
            ->groupBy('department')
            ->map(fn ($rows, $department) => $this->statusRow(['department' => $department], $rows))
            ->values();

        return [
            'distribution' => $distribution,
            'by_year' => $byYear,
            'by_department' => $byDepartment,
        ];
    }

    /**
     * Aggregate answers of a survey into per-question statistics.
     *
     * @return array<string, mixed>
     */
    public function surveyResults(Request $request, Survey $survey): array
    {
        $questions = $survey->questions()->with('options')->get();

        $answers = SurveyAnswer::query()
            ->join('survey_responses', 'survey_responses.id', '=', 'survey_answers.response_id')
            ->where('survey_responses.survey_id', $survey->id)
            ->where('survey_responses.status', 'submitted')
            ->whereIn('survey_answers.question_id', $questions->pluck('id'))
            ->get(['survey_answers.question_id', 'survey_answers.value'])
            ->groupBy('question_id');

        $questionStats = $questions->map(function (Question $question) use ($answers) {
            $rows = $answers->get($question->id, collect());
            $values = $rows->flatMap(fn ($row) => $this->expandAnswer($row->value));

            $optionCounts = $question->options->map(function ($option) use ($values) {
                $needle = (string) ($option->value ?? $option->label);

                return [
                    'label' => $option->label,
                    'value' => $option->value ?? $option->label,
                    'count' => $values->filter(
                        fn ($value) => (string) $value === $needle
                            || (string) $value === (string) $option->id
                            || (string) $value === (string) $option->label
                    )->count(),
                ];
            })->values();

            $average = null;
            if (in_array($question->type, ['rating', 'scale', 'number'], true)) {
                $numeric = $values->filter(fn ($value) => is_numeric($value))->map(fn ($value) => (float) $value);
                if ($numeric->isNotEmpty()) {
                    $average = round($numeric->avg(), 1);
                }
            }

            return [
                'question_id' => $question->id,
                'label' => $question->label,
                'type' => $question->type,
                'response_count' => $rows->count(),
                'option_counts' => $optionCounts,
                'average' => $average,
            ];
        })->values();

        $totalResponses = SurveyResponse::query()
            ->forInstitution($this->institutionId($request))
            ->where('survey_id', $survey->id)
            ->where('status', 'submitted')
            ->count();

        return [
            'survey' => ['id' => $survey->id, 'title' => $survey->title],
            'total_responses' => $totalResponses,
            'question_stats' => $questionStats,
        ];
    }

    /**
     * Alumni query scoped by tenant and optional analytics filters.
     */
    public function alumniQuery(Request $request): Builder
    {
        return Alumni::query()
            ->forInstitution($this->institutionId($request))
            ->when($request->filled('graduation_year_id'), fn ($query) => $query->where('graduation_year_id', $request->graduation_year_id))
            ->when($request->filled('department_id'), fn ($query) => $query->where('department_id', $request->department_id));
    }

    /**
     * Submitted-responses query scoped by tenant and optional filters.
     */
    public function responsesQuery(Request $request): Builder
    {
        return SurveyResponse::query()
            ->forInstitution($this->institutionId($request))
            ->when($request->filled('survey_id'), fn ($query) => $query->where('survey_id', $request->survey_id))
            ->when($request->filled('graduation_year_id'), fn ($query) => $query->whereHas('alumni', fn ($alumni) => $alumni->where('graduation_year_id', $request->graduation_year_id)))
            ->when($request->filled('department_id'), fn ($query) => $query->whereHas('alumni', fn ($alumni) => $alumni->where('department_id', $request->department_id)));
    }

    /**
     * The institution scope for the current user: super admin may target any
     * institution via ?institution_id; everyone else is locked to their own.
     */
    public function institutionId(Request $request): ?string
    {
        $user = $request->user();

        if ($user->hasRole('super_admin')) {
            return $request->filled('institution_id') ? $request->institution_id : null;
        }

        return $user->institution_id;
    }

    /**
     * @param  Collection<int, \stdClass>  $rows
     */
    public function employmentDistribution(Builder $query): Collection
    {
        return $query
            ->selectRaw("COALESCE(NULLIF(employment_status, ''), 'unknown') as status, count(*) as count")
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->count])
            ->values();
    }

    /**
     * Turn grouped {status, count} rows into a flat status-keyed array.
     *
     * @param  array<string, mixed>  $base
     * @param  Collection<int, \stdClass>  $rows
     * @return array<string, mixed>
     */
    public function statusRow(array $base, Collection $rows): array
    {
        $statuses = ['working', 'unemployed', 'entrepreneur', 'continuing_study', 'unknown'];

        foreach ($statuses as $status) {
            $base[$status] = (int) $rows->firstWhere('status', $status)?->count ?? 0;
        }

        return $base;
    }

    /**
     * Normalize a stored answer value into a list of scalar values
     * (JSON-encoded multiple_choice answers expand to one entry per choice).
     *
     * @return array<int, mixed>
     */
    public function expandAnswer(?string $value): array
    {
        if ($value === null || $value === '') {
            return [];
        }

        $trimmed = trim($value);

        if (str_starts_with($trimmed, '[') || str_starts_with($trimmed, '{')) {
            $decoded = json_decode($trimmed, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return array_values($decoded);
            }
        }

        return [$value];
    }
}
