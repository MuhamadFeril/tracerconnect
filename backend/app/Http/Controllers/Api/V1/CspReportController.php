<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CspReportController extends Controller
{
    /**
     * Handle CSP violation reports from the browser.
     * The browser sends a JSON payload when a policy violation occurs.
     */
    public function store(Request $request): JsonResponse
    {
        $report = $request->all();

        Log::warning('CSP Violation', [
            'document_uri' => $report['csp-report']['document-uri'] ?? null,
            'violated_directive' => $report['csp-report']['violated-directive'] ?? null,
            'blocked_uri' => $report['csp-report']['blocked-uri'] ?? null,
            'source_file' => $report['csp-report']['source-file'] ?? null,
            'line_number' => $report['csp-report']['line-number'] ?? null,
            'column_number' => $report['csp-report']['column-number'] ?? null,
            'effective_directive' => $report['csp-report']['effective-directive'] ?? null,
            'original_policy' => $report['csp-report']['original-policy'] ?? null,
        ]);

        return response()->json(['status' => 'ok']);
    }
}
