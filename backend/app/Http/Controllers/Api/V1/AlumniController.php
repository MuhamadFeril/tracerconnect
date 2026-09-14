<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Alumni\ImportAlumniRequest;
use App\Http\Requests\Alumni\StoreAlumniRequest;
use App\Http\Requests\Alumni\UpdateAlumniRequest;
use App\Http\Resources\AlumniResource;
use App\Models\Alumni;
use App\Services\AlumniImportService;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class AlumniController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Alumni::class);

        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $alumni = $this->baseQuery($request)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return ApiResponse::success(
            AlumniResource::collection($alumni->items()),
            'Data alumni berhasil diambil',
            ApiResponse::paginationMeta($alumni)
        );
    }

    public function store(StoreAlumniRequest $request)
    {
        $this->authorize('create', Alumni::class);

        $alumnus = Alumni::create($request->validated());

        return ApiResponse::success(
            new AlumniResource($alumnus->load('department:id,name', 'graduationYear:id,year')),
            'Data alumni berhasil dibuat',
            [],
            201
        );
    }

    public function show(Alumni $alumnus)
    {
        $this->authorize('view', $alumnus);

        return ApiResponse::success(
            new AlumniResource($alumnus->load('department:id,name', 'graduationYear:id,year')),
            'Data alumni berhasil diambil'
        );
    }

    public function update(UpdateAlumniRequest $request, Alumni $alumnus)
    {
        $this->authorize('update', $alumnus);

        $alumnus->update($request->validated());

        return ApiResponse::success(
            new AlumniResource($alumnus->fresh(['department:id,name', 'graduationYear:id,year'])),
            'Data alumni berhasil diperbarui'
        );
    }

    public function destroy(Alumni $alumnus)
    {
        $this->authorize('delete', $alumnus);

        $alumnus->delete();

        return ApiResponse::success([], 'Data alumni berhasil dihapus');
    }

    /**
     * Export the scoped alumni list as a CSV download.
     */
    public function export(Request $request)
    {
        $this->authorize('viewAny', Alumni::class);

        $alumni = $this->baseQuery($request)->orderBy('name')->cursor();

        $filename = 'alumni-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($alumni) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, [
                'nis_nim', 'name', 'gender', 'email', 'phone', 'department', 'graduation_year',
                'employment_status', 'company_name', 'position', 'location',
            ]);

            foreach ($alumni as $alumnus) {
                fputcsv($handle, [
                    $this->sanitizeCsvCell($alumnus->nis_nim),
                    $this->sanitizeCsvCell($alumnus->name),
                    $this->sanitizeCsvCell($alumnus->gender),
                    $this->sanitizeCsvCell($alumnus->email),
                    $this->sanitizeCsvCell($alumnus->phone),
                    $this->sanitizeCsvCell($alumnus->department?->name),
                    $alumnus->graduationYear?->year,
                    $this->sanitizeCsvCell($alumnus->employment_status),
                    $this->sanitizeCsvCell($alumnus->company_name),
                    $this->sanitizeCsvCell($alumnus->position),
                    $this->sanitizeCsvCell($alumnus->location),
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * Import alumni from an uploaded CSV file.
     */
    public function import(ImportAlumniRequest $request)
    {
        $this->authorize('import', Alumni::class);

        $result = app(AlumniImportService::class)->import(
            $request->validated()['institution_id'],
            $request->file('file')
        );

        return ApiResponse::success($result, 'Import alumni selesai');
    }

    /**
     * Tenant-scoped query with search, filters, and eager loading.
     */
    private function baseQuery(Request $request): Builder
    {
        $currentUser = $request->user();

        return Alumni::query()
            ->with('department:id,name')
            ->with('graduationYear:id,year')
            ->when($currentUser->institution_id !== null, fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->institution_id === null && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->filtered($request->all());
    }

    /**
     * Prevent CSV formula injection: prefix cells that could be interpreted
     * as spreadsheet formulas with an apostrophe.
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
