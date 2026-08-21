<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Alumni-facing registration state.
            'registered' => $user ? $this->registrations()->where('user_id', $user->id)->exists() : null,
            'attended' => $user ? (bool) $this->registrations()->where('user_id', $user->id)->value('attended') : null,
            'participants_count' => $this->whenCounted('registrations'),
        ];
    }
}
