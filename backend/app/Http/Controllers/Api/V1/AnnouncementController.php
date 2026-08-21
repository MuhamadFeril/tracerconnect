<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Announcement\StoreAnnouncementRequest;
use App\Http\Requests\Announcement\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Announcement::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $announcements = Announcement::query()
            ->when(! $currentUser->hasRole('super_admin'), fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->hasRole('super_admin') && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->when($currentUser->hasRole('alumni'), fn ($query) => $query->visibleToAlumni($currentUser->institution_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = addcslashes(trim((string) $request->search), '%_\\');
                $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('body', 'like', "%{$search}%"));
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success(
            AnnouncementResource::collection($announcements->items()),
            'Data pengumuman berhasil diambil',
            ApiResponse::paginationMeta($announcements)
        );
    }

    public function store(StoreAnnouncementRequest $request)
    {
        $this->authorize('create', Announcement::class);

        $data = $request->validated();

        $announcement = Announcement::create([...$data, 'created_by' => $request->user()->id]);

        if ($announcement->status === 'published') {
            NotificationService::notifyAlumni(
                $announcement->institution_id,
                'Pengumuman baru',
                $announcement->title,
                '/pengumuman',
                'announcement'
            );
        }

        return ApiResponse::success(new AnnouncementResource($announcement), 'Pengumuman berhasil dibuat', [], 201);
    }

    public function show(Announcement $announcement)
    {
        $this->authorize('view', $announcement);

        return ApiResponse::success(new AnnouncementResource($announcement), 'Data pengumuman berhasil diambil');
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement)
    {
        $this->authorize('update', $announcement);

        $wasPublished = $announcement->status === 'published';
        $announcement->update($request->validated());

        if ($announcement->status === 'published' && ! $wasPublished) {
            NotificationService::notifyAlumni(
                $announcement->institution_id,
                'Pengumuman baru',
                $announcement->title,
                '/pengumuman',
                'announcement'
            );
        }

        return ApiResponse::success(new AnnouncementResource($announcement->fresh()), 'Pengumuman berhasil diperbarui');
    }

    public function destroy(Announcement $announcement)
    {
        $this->authorize('delete', $announcement);

        $announcement->delete();

        return ApiResponse::success([], 'Pengumuman berhasil dihapus');
    }
}
