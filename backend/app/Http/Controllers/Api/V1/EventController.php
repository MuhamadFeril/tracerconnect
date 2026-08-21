<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Event\StoreEventRequest;
use App\Http\Requests\Event\UpdateEventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Models\EventRegistration;
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
                $search = addcslashes(trim((string) $request->search), '%_\\');
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
        $this->authorize('create', Event::class);

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

    /**
     * Register the authenticated alumni for an event.
     */
    public function register(Request $request, Event $event)
    {
        $this->authorize('view', $event);

        $user = $request->user();

        // Only published events from the user's institution can be joined.
        if ($event->status !== 'published' || $event->institution_id !== $user->institution_id) {
            return ApiResponse::error('Acara tidak tersedia untuk didaftar', [], 422);
        }

        if ($event->registrations()->where('user_id', $user->id)->exists()) {
            return ApiResponse::error('Anda sudah terdaftar pada acara ini', [], 422);
        }

        $registration = $event->registrations()->create([
            'user_id' => $user->id,
            'alumni_id' => $user->alumni?->id,
            'attended' => false,
            'registered_at' => now(),
        ]);

        return ApiResponse::success(
            ['registration_id' => $registration->id, 'registered' => true],
            'Pendaftaran acara berhasil',
            [],
            201
        );
    }

    /**
     * Cancel the authenticated alumni's registration for an event.
     */
    public function unregister(Request $request, Event $event)
    {
        $this->authorize('view', $event);

        $event->registrations()->where('user_id', $request->user()->id)->delete();

        return ApiResponse::success(['registered' => false], 'Pendaftaran acara dibatalkan');
    }

    /**
     * List participants (staff view for the event's institution).
     */
    public function participants(Request $request, Event $event)
    {
        $this->authorize('update', $event);

        $perPage = max(1, min($request->integer('per_page', 50), 100));

        $participants = $event->registrations()
            ->with('alumni.department:id,name', 'alumni.graduationYear:id,year')
            ->orderByDesc('registered_at')
            ->paginate($perPage);

        return ApiResponse::success(
            $participants->through(fn (EventRegistration $registration) => [
                'id' => $registration->id,
                'attended' => $registration->attended,
                'registered_at' => $registration->registered_at,
                'user' => [
                    'id' => $registration->user_id,
                    'name' => $registration->alumni?->name ?? $registration->user?->name,
                ],
                'alumni' => $registration->alumni ? [
                    'id' => $registration->alumni->id,
                    'name' => $registration->alumni->name,
                    'department' => $registration->alumni->department?->name,
                    'graduation_year' => $registration->alumni->graduationYear?->year,
                ] : null,
            ])->items(),
            'Data peserta berhasil diambil',
            ApiResponse::paginationMeta($participants)
        );
    }

    /**
     * Mark a participant as attended (staff view for the event's institution).
     */
    public function markAttended(Request $request, Event $event, EventRegistration $registration)
    {
        $this->authorize('update', $event);

        if ($registration->event_id !== $event->id) {
            return ApiResponse::error('Peserta tidak terdaftar pada acara ini', [], 422);
        }

        $registration->update(['attended' => (bool) $request->boolean('attended', true)]);

        return ApiResponse::success(['attended' => $registration->attended], 'Kehadiran berhasil diperbarui');
    }
}
