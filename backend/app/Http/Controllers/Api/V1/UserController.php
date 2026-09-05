<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', User::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $users = User::query()
            ->with('institution:id,name')
            ->with('roles:id,name')
            ->when(! $currentUser->hasRole('super_admin'), function ($query) use ($currentUser) {
                // Tenant isolation: institution admins only see users of their own institution.
                $query->where('institution_id', $currentUser->institution_id);
            })
            ->when($currentUser->hasRole('super_admin') && $request->filled('institution_id'), function ($query) use ($request) {
                $query->where('institution_id', $request->institution_id);
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = addcslashes(trim((string) $request->search), '%_\\');
                $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            })
            ->when($request->filled('role'), fn ($query) => $query->role($request->role))
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return ApiResponse::success(
            UserResource::collection($users->items()),
            'Data pengguna berhasil diambil',
            ApiResponse::paginationMeta($users)
        );
    }

    public function store(StoreUserRequest $request)
    {
        $this->authorize('create', User::class);

        $data = $request->validated();

        // Super-admin accounts are platform-level and must never belong to
        // an institution — strip any accidental value.
        $institutionId = $data['role'] === 'super_admin'
            ? null
            : ($data['institution_id'] ?? null);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'institution_id' => $institutionId,
            'is_active' => true,
        ]);

        $user->assignRole($data['role']);

        AuditService::log('create', 'user', $user->id, null, ['name' => $user->name, 'email' => $user->email, 'role' => $data['role']], $request);

        return ApiResponse::success(
            new UserResource($user->load('institution:id,name', 'roles:id,name')),
            'Pengguna berhasil dibuat',
            [],
            201
        );
    }

    public function show(User $user)
    {
        $this->authorize('view', $user);

        return ApiResponse::success(
            new UserResource($user->load('institution:id,name', 'roles:id,name')),
            'Data pengguna berhasil diambil'
        );
    }

    public function update(UpdateUserRequest $request, User $user)
    {
        $this->authorize('update', $user);

        $data = $request->validated();

        $updates = collect($data)->only(['name', 'email', 'is_active'])->all();

        if ($updates !== []) {
            $user->update($updates);
        }

        if (! empty($data['password'])) {
            $user->update(['password' => $data['password']]);
        }

        if (! empty($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        // Deactivating a user revokes all of their API tokens immediately.
        if (array_key_exists('is_active', $data) && ! $data['is_active']) {
            $user->tokens()->delete();
        }

        // Mirror an admin-edited name/email onto the linked alumni record so
        // jejaring/alumni surfaces never show a stale identity.
        $user->syncLinkedAlumniIdentity();

        AuditService::log('update', 'user', $user->id, null, ['name' => $user->name, 'email' => $user->email, 'is_active' => $user->is_active, 'role' => $data['role'] ?? null], $request);

        return ApiResponse::success(
            new UserResource($user->fresh(['institution:id,name', 'roles:id,name'])),
            'Pengguna berhasil diperbarui'
        );
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorize('delete', $user);

        AuditService::log('delete', 'user', $user->id, null, ['name' => $user->name, 'email' => $user->email], $request);

        $user->delete();

        return ApiResponse::success([], 'Pengguna berhasil dihapus');
    }
}
