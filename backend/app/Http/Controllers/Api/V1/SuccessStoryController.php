<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\SuccessStory\StoreSuccessStoryRequest;
use App\Http\Requests\SuccessStory\UpdateSuccessStoryRequest;
use App\Http\Resources\SuccessStoryResource;
use App\Models\SuccessStory;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SuccessStoryController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', SuccessStory::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $stories = SuccessStory::query()
            ->with('alumni.department:id,name', 'alumni.graduationYear:id,year')
            ->when($currentUser->institution_id !== null, fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->institution_id === null && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->when($currentUser->hasRole('alumni'), fn ($query) => $query->visibleToAlumni($currentUser->institution_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = addcslashes(trim((string) $request->search), '%_\\');
                $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('content', 'like', "%{$search}%"));
            })
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return ApiResponse::success(
            SuccessStoryResource::collection($stories->items()),
            'Data kisah sukses berhasil diambil',
            ApiResponse::paginationMeta($stories)
        );
    }

    public function store(StoreSuccessStoryRequest $request)
    {
        $data = $request->safe()->except(['cover_image']);

        $coverPath = $request->file('cover_image')->store('stories', 'public');
        $data['cover_image_path'] = $coverPath;

        // Always set published_at to now when publishing — no manual date needed.
        if (($data['status'] ?? 'draft') === 'published') {
            $data['published_at'] = now();
        }

        $story = SuccessStory::create([...$data, 'created_by' => $request->user()->id]);

        if ($story->status === 'published') {
            NotificationService::notifyAlumni(
                $story->institution_id,
                'Kisah sukses baru',
                $story->title,
                '/kisah-sukses',
                'story'
            );
        }

        return ApiResponse::success(
            new SuccessStoryResource($story->load('alumni.department:id,name', 'alumni.graduationYear:id,year')),
            'Kisah sukses berhasil dibuat',
            [],
            201
        );
    }

    public function show(SuccessStory $successStory)
    {
        $this->authorize('view', $successStory);

        return ApiResponse::success(
            new SuccessStoryResource($successStory->load('alumni.department:id,name', 'alumni.graduationYear:id,year')),
            'Detail kisah sukses berhasil diambil'
        );
    }

    public function update(UpdateSuccessStoryRequest $request, SuccessStory $successStory)
    {
        $this->authorize('update', $successStory);

        $wasPublished = $successStory->status === 'published';
        $data = $request->safe()->except(['cover_image']);

        if ($request->hasFile('cover_image')) {
            if ($successStory->cover_image_path) {
                Storage::disk('public')->delete($successStory->cover_image_path);
            }
            $data['cover_image_path'] = $request->file('cover_image')->store('stories', 'public');
        }

        $newStatus = $data['status'] ?? $successStory->status;

        // Always set published_at to now when transitioning to published.
        if ($newStatus === 'published' && ! $wasPublished) {
            $data['published_at'] = now();
        }

        $successStory->update($data);

        if ($successStory->status === 'published' && ! $wasPublished) {
            NotificationService::notifyAlumni(
                $successStory->institution_id,
                'Kisah sukses baru',
                $successStory->title,
                '/kisah-sukses',
                'story'
            );
        }

        return ApiResponse::success(
            new SuccessStoryResource($successStory->fresh(['alumni.department:id,name', 'alumni.graduationYear:id,year'])),
            'Kisah sukses berhasil diperbarui'
        );
    }

    public function destroy(SuccessStory $successStory)
    {
        $this->authorize('delete', $successStory);

        if ($successStory->cover_image_path) {
            Storage::disk('public')->delete($successStory->cover_image_path);
        }

        $successStory->delete();

        return ApiResponse::success([], 'Kisah sukses berhasil dihapus');
    }
}
