<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->user()->can('role.view')) {
            return ApiResponse::error('Anda tidak memiliki akses ke data ini', [], 403);
        }

        $permissions = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name']);

        return ApiResponse::success($permissions, 'Daftar permission berhasil diambil');
    }
}
