<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Event\StoreEventRequest;
use App\Http\Requests\Event\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Services\NotificationService;
use App\Support\ApiResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Event::class);

        $currentUser = $request->user();
        $perPage = max(1, min($request->integer('per_page', 15), 100));

        $events = Event::query()
            ->when(! $currentUser->hasRole('super_admin'), fn ($query) => $query->forInstitution($currentUser->institution_id))
            ->when($currentUser->hasRole('super_admin') && $request->filled('institution_id'), fn ($query) => $query->forInstitution($request->institution_id))
            ->when($currentUser->hasRole('alumni'), fn ($query) => $query->visibleToAlumni($currentUser->institution_id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = trim((string) $request->search);
                $query->where(fn ($q) => $q->where('title', 'like', "%{$search}%")->orWhere('location', 'like', "%{$search}%"));
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->boolean('upcoming'), fn ($query) => $query->where('starts_at', '>=', now()))
            ->orderByDesc('starts_at')
            ->paginate($perPage);

        return ApiResponse::success(
            EventResource::collection($events->items()),
            'Data acara berhasil diambil',
            ApiResponse::paginationMeta($events)
        );
    }

    public function store(StoreEventRequest $request)
    {
        $data = $request->validated();

        $event = Event::create([...$data, 'created_by' => $request->user()->id]);

        if ($event->status === 'published') {
            NotificationService::notifyAlumni(
                $event->institution_id,
                'Acara baru',
                $event->title,
                '/acara',
                'event'
            );
        }

        return ApiResponse::success(new EventResource($event), 'Acara berhasil dibuat', [], 201);
    }

    public function show(Event $event)
    {
        $this->authorize('view', $event);

        return ApiResponse::success(new EventResource($event), 'Data acara berhasil diambil');
    }

    public function update(UpdateEventRequest $request, Event $event)
    {
        $this->authorize('update', $event);

        $wasPublished = $event->status === 'published';
        $event->update($request->validated());

        if ($event->status === 'published' && ! $wasPublished) {
            NotificationService::notifyAlumni(
                $event->institution_id,
                'Acara baru',
                $event->title,
                '/acara',
                'event'
            );
        }

        return ApiResponse::success(new EventResource($event->fresh()), 'Acara berhasil diperbarui');
    }

    public function destroy(Event $event)
    {
        $this->authorize('delete', $event);

        $event->delete();

        return ApiResponse::success([], 'Acara berhasil dihapus');
    }
}
