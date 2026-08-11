<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        if (! $request->user()->can('role.view')) {
            return ApiResponse::error('Anda tidak memiliki akses ke data ini', [], 403);
        }

        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name'])
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'guard_name' => $role->guard_name,
                'permissions' => $role->permissions->pluck('name')->values(),
            ]);

        return ApiResponse::success($roles, 'Daftar role berhasil diambil');
    }
}
