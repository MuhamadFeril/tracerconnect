<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Survey;
use App\Services\ReportService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * All report endpoints are gated by `report.view` (the same permission the
     * reports page itself requires). The dedicated export permissions
     * (`alumni.export`, `response.export`) are intentionally not required here:
     * admin_institusi has `report.view` but may lack those, and downloading a
     * report of data they are already allowed to view matches the MVP scope.
     */
    public function __construct(private readonly ReportService $reports)
    {
    }

    /**
     * Executive summary as JSON (rendered on the React reports page).
     */
    public function executiveSummary(Request $request)
    {
        abort_unless($request->user()->can('report.view'), 403);

        return ApiResponse::success(
            $this->reports->executiveSummary($request),
            'Executive summary berhasil diambil'
        );
    }

    /**
     * Executive summary as a PDF download.
     */
    public function executiveSummaryPdf(Request $request): StreamedResponse
    {
        abort_unless($request->user()->can('report.view'), 403);

        $data = $this->reports->executiveSummary($request);

        $filename = 'executive-summary-'.now()->format('Ymd-His').'.pdf';

        return $this->pdfResponse(
            view('reports.executive-summary', ['data' => $data])->render(),
            $filename
        );
    }

    /**
     * Tracer study report as a PDF download.
     */
    public function tracerPdf(Request $request): StreamedResponse
    {
        abort_unless($request->user()->can('report.view'), 403);

        $data = $this->reports->tracerReport($request);

        $filename = 'tracer-report-'.now()->format('Ymd-His').'.pdf';

        return $this->pdfResponse(
            view('reports.tracer', ['data' => $data])->render(),
            $filename
        );
    }

    /**
     * Alumni data export as CSV or XLSX (respects the same filters as the list).
     */
    public function alumniExport(Request $request, string $format): StreamedResponse
    {
        abort_unless($request->user()->can('report.view'), 403);

        $headers = [
            'NIS/NIM', 'Nama', 'Jenis Kelamin', 'Email', 'Telepon', 'Jurusan',
            'Tahun Lulus', 'Status Pekerjaan', 'Perusahaan', 'Jabatan', 'Lokasi', 'Alamat',
        ];

        $rows = $this->reports->alumniRows($request);
        $filename = 'alumni-'.now()->format('Ymd-His');

        return $format === 'xlsx'
            ? $this->xlsxResponse($this->reports->xlsxContent($headers, $rows), $filename.'.xlsx')
            : $this->csvResponse($this->reports->csvContent($headers, $rows), $filename.'.csv');
    }

    /**
     * Aggregated results of a survey as CSV or XLSX.
     */
    public function surveyResultsExport(Request $request, Survey $survey, string $format): StreamedResponse
    {
        abort_unless($request->user()->can('report.view'), 403);

        if ($request->user()->institution_id !== null && $survey->institution_id !== $request->user()->institution_id) {
            abort(403);
        }

        $headers = ['Pertanyaan', 'Tipe', 'Jumlah Responden', 'Rata-rata', 'Distribusi Jawaban'];
        $rows = $this->reports->surveyResultRows($request, $survey);
        $filename = 'hasil-survey-'.now()->format('Ymd-His');

        return $format === 'xlsx'
            ? $this->xlsxResponse($this->reports->xlsxContent($headers, $rows), $filename.'.xlsx')
            : $this->csvResponse($this->reports->csvContent($headers, $rows), $filename.'.csv');
    }

    private function pdfResponse(string $content, string $filename): StreamedResponse
    {
        $pdf = $this->reports->renderPdf($content);

        return response()->streamDownload(function () use ($pdf) {
            echo $pdf;
        }, $filename, ['Content-Type' => 'application/pdf']);
    }

    private function csvResponse(string $content, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    private function xlsxResponse(string $content, string $filename): StreamedResponse
    {
        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
