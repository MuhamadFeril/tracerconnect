<?php

namespace App\Services;

use App\Models\Alumni;
use App\Models\Institution;
use App\Models\Survey;
use App\Models\SurveyResponse;
use Dompdf\Dompdf;
use Illuminate\Http\Request;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;

/**
 * Reporting module (phase 7): executive summary, tracer study report, and
 * alumni / survey-results exports in CSV, XLSX, and PDF formats.
 */
class ReportService
{
    public function __construct(private readonly AnalyticsService $analytics)
    {
    }

    /**
     * Executive summary payload shared by the JSON endpoint, the on-screen
     * summary, and the PDF download.
     *
     * @return array<string, mixed>
     */
    public function executiveSummary(Request $request): array
    {
        $overview = $this->analytics->overview($request);
        $institutionId = $this->analytics->institutionId($request);

        $totalResponses = SurveyResponse::query()
            ->forInstitution($institutionId)
            ->where('status', 'submitted')
            ->count();

        $totalSurveys = Survey::query()
            ->forInstitution($institutionId)
            ->count();

        return array_merge($overview, [
            'institution' => $this->institutionLabel($request),
            'generated_at' => now()->toDateTimeString(),
            'total_surveys' => $totalSurveys,
            'total_responses' => $totalResponses,
        ]);
    }

    /**
     * Tracer study payload for the PDF tracer report.
     *
     * @return array<string, mixed>
     */
    public function tracerReport(Request $request): array
    {
        $overview = $this->analytics->overview($request);
        $employment = $this->analytics->employment($request);

        return [
            'institution' => $this->institutionLabel($request),
            'generated_at' => now()->toDateTimeString(),
            'total_alumni' => $overview['total_alumni'],
            'total_respondents' => $overview['total_respondents'],
            'response_rate' => $overview['response_rate'],
            'employment_rate' => $overview['employment_rate'],
            'entrepreneurship_rate' => $overview['entrepreneurship_rate'],
            'continuing_study_rate' => $overview['continuing_study_rate'],
            'unemployed_rate' => $overview['unemployed_rate'],
            'distribution' => $employment['distribution'],
            'by_year' => $employment['by_year'],
            'by_department' => $employment['by_department'],
        ];
    }

    /**
     * Tenant-scoped alumni rows (header order defined by the caller).
     *
     * @return array<int, array<int, mixed>>
     */
    public function alumniRows(Request $request): array
    {
        return Alumni::query()
            ->with('department:id,name')
            ->with('graduationYear:id,year')
            ->forInstitution($this->analytics->institutionId($request))
            ->filtered($request->all())
            ->orderBy('name')
            ->get()
            ->map(fn (Alumni $alumnus) => [
                $alumnus->nis_nim,
                $alumnus->name,
                $alumnus->gender,
                $alumnus->email,
                $alumnus->phone,
                $alumnus->department?->name,
                $alumnus->graduationYear?->year,
                $alumnus->employment_status,
                $alumnus->company_name,
                $alumnus->position,
                $alumnus->location,
                $alumnus->address,
            ])
            ->all();
    }

    /**
     * Per-question rows of a survey's aggregated results.
     *
     * @return array<int, array<int, mixed>>
     */
    public function surveyResultRows(Request $request, Survey $survey): array
    {
        $results = $this->analytics->surveyResults($request, $survey);

        return collect($results['question_stats'])->map(function (array $stat) {
            $breakdown = collect($stat['option_counts'])
                ->filter(fn ($option) => $option['count'] > 0)
                ->map(fn ($option) => "{$option['label']}: {$option['count']}")
                ->implode('; ');

            return [
                $stat['label'],
                $stat['type'],
                $stat['response_count'],
                $stat['average'] ?? '',
                $breakdown,
            ];
        })->all();
    }

    /**
     * Serialize rows to CSV (with formula-injection protection).
     *
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $rows
     */
    public function csvContent(array $headers, array $rows): string
    {
        $output = fopen('php://temp', 'r+');

        fputcsv($output, $headers);

        foreach ($rows as $row) {
            fputcsv($output, array_map(fn ($cell) => $this->sanitizeCsvCell($cell), $row));
        }

        rewind($output);

        return stream_get_contents($output);
    }

    /**
     * Serialize rows to an XLSX byte string (bold header row).
     *
     * @param  array<int, string>  $headers
     * @param  array<int, array<int, mixed>>  $rows
     */
    public function xlsxContent(array $headers, array $rows): string
    {
        $path = sys_get_temp_dir().'/tc-report-'.uniqid().'.xlsx';

        try {
            $writer = new Writer();
            $writer->openToFile($path);

            $writer->addRow(Row::fromValues(
                $headers,
                (new Style())->setFontBold()->setFontSize(11)
            ));

            foreach ($rows as $row) {
                // Same formula-injection guard as the CSV path.
                $writer->addRow(Row::fromValues(array_map(
                    fn ($cell) => $this->sanitizeCsvCell($cell) ?? '',
                    $row
                )));
            }

            $writer->close();

            return file_get_contents($path);
        } finally {
            @unlink($path);
        }
    }

    /**
     * Render a Blade view to a PDF byte string via Dompdf.
     */
    public function renderPdf(string $html): string
    {
        $dompdf = new Dompdf([
            'isRemoteEnabled' => false,
            'isPhpEnabled' => false,
            'isHtml5ParserEnabled' => true,
        ]);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    /**
     * Human-readable institution scope label used inside reports.
     */
    private function institutionLabel(Request $request): string
    {
        $user = $request->user();

        if ($user->hasRole('admin_institusi') && $user->institution_id === null && ! $request->filled('institution_id')) {
            return 'Semua Institusi (Platform)';
        }

        $institutionId = $this->analytics->institutionId($request);

        return $institutionId
            ? (Institution::find($institutionId)?->name ?? '—')
            : '—';
    }

    /**
     * Prevent CSV/XLSX formula injection: prefix cells that could be interpreted
     * as spreadsheet formulas with a tab character.
     *
     * Covers: = + - @ \t \r (Excel formula prefixes)
     */
    private function sanitizeCsvCell(mixed $value): mixed
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }

        $value = trim($value);

        // Excel interprets these as formula starters
        if (preg_match('/^[=+\-@\t\r]/', $value)) {
            return "\t{$value}";
        }

        return $value;
    }
}
