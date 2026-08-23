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
            'primary_color' => $this->primary_color,
            'favicon_path' => $this->favicon_path,
            'cover_image_path' => $this->cover_image_path,
            'report_header' => $this->report_header,
            'report_footer' => $this->report_footer,
            'custom_footer' => $this->custom_footer,
            'contact_email' => $this->contact_email,
            'contact_phone' => $this->contact_phone,
            'about' => $this->about,
            'description' => $this->description,
            'status' => $this->status,
            'users_count' => $this->whenCounted('users'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
