<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InstitutionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'code' => $this->code,
            'email' => $this->email,
            'phone' => $this->phone,
            'website' => $this->website,
            'address' => $this->address,
            'logo_path' => $this->logo_path,
            'description' => $this->description,
            'status' => $this->status,
            'users_count' => $this->whenCounted('users'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
