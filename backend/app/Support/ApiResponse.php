<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Standard API response envelope per the TracerConnect API standard.
 *
 * success: { success: true, message, data, meta }
 * error:   { success: false, message, errors }
 */
class ApiResponse
{
    public static function success(mixed $data = [], string $message = 'Data berhasil diambil', array $meta = [], int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta,
        ], $status);
    }

    public static function error(string $message = 'Terjadi kesalahan', array $errors = [], int $status = 400): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }

    /**
     * Standard pagination metadata for collections.
     */
    public static function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}
