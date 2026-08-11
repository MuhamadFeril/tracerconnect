<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\District;
use App\Models\Province;
use App\Models\Regency;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class RegionController extends Controller
{
    /**
     * Public list of provinces, used by the registration form
     * so new alumni can choose their birthplace province.
     */
    public function provinces(): JsonResponse
    {
        $provinces = Province::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        return ApiResponse::success(
            $provinces->map(fn (Province $province) => [
                'id' => $province->id,
                'code' => $province->code,
                'name' => $province->name,
            ])->values(),
            'Daftar provinsi berhasil diambil'
        );
    }

    /**
     * Public list of regencies (kabupaten/kota) for a province,
     * used by the registration form.
     */
    public function regencies(Province $province): JsonResponse
    {
        $regencies = Regency::query()
            ->where('province_id', $province->id)
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        return ApiResponse::success(
            $regencies->map(fn (Regency $regency) => [
                'id' => $regency->id,
                'code' => $regency->code,
                'name' => $regency->name,
            ])->values(),
            'Daftar kabupaten/kota berhasil diambil'
        );
    }

    /**
     * Public list of districts (kecamatan) for a regency.
     */
    public function districts(Regency $regency): JsonResponse
    {
        $districts = District::query()
            ->where('regency_id', $regency->id)
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        return ApiResponse::success(
            $districts->map(fn (District $district) => [
                'id' => $district->id,
                'code' => $district->code,
                'name' => $district->name,
            ])->values(),
            'Daftar kecamatan berhasil diambil'
        );
    }
}
