<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'institution_id' => $this->institution_id,
            'avatar_url' => $this->avatar_path ? url('storage/'.$this->avatar_path) : null,
            'institution' => $this->whenLoaded('institution', fn () => [
                'id' => $this->institution->id,
                'name' => $this->institution->name,
            ]),
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')->values()),
            // Requires eager-loading 'alumni.department' & 'alumni.graduationYear'
            // to avoid lazy N+1 queries (see AuthController load strings).
            'alumni' => $this->whenLoaded('alumni', fn () => $this->alumni ? [
                'id' => $this->alumni->id,
                'name' => $this->alumni->name,
                'nis_nim' => $this->alumni->nis_nim,
                'department' => $this->alumni->department?->name,
                'graduation_year' => $this->alumni->graduationYear?->year,
                'birthplace_label' => $this->alumni->birthplace_label,
                'employment_status' => $this->alumni->employment_status,
            ] : null),
            'is_active' => $this->is_active,
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
