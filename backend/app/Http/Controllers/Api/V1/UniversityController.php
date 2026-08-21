<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\University;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UniversityController extends Controller
{
    /**
     * Public list of universities (seluruh Indonesia), used by the
     * registration/profile career forms so alumni can pick where they study.
     * No auth required.
     */
    public function index(Request $request): JsonResponse
    {
        $universities = University::query()
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->search);
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            // Bounded so a bare request never ships the full national dataset
            // (5.000+ kampus) in a single response — the register form now
            // searches server-side by name instead of downloading everything.
            ->limit(100)
            ->get(['id', 'code', 'name', 'type', 'province', 'city']);

        return ApiResponse::success($universities, 'Daftar universitas berhasil diambil');
    }

    /**
     * Study programs (prodi) offered by a university. Duplicate names across
     * jenjang (D-III/S1/S2) are deduplicated so the dropdown stays clean.
     */
    public function studyPrograms(University $university): JsonResponse
    {
        $programs = $university->studyPrograms()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->unique('name')
            ->values();

        return ApiResponse::success($programs, 'Daftar program studi berhasil diambil');
    }
}
