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
            'company_name' => $this->company_name,
            'avatar_url' => $this->avatar_path ? '/storage/'.$this->avatar_path : null,
            'institution' => $this->whenLoaded('institution', fn () => [
                'id' => $this->institution->id,
                'name' => $this->institution->name,
            ]),
            'roles' => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')->values()),
            // User-level biodata (used when no linked alumni record exists,
            // e.g. admin accounts). For alumni users these are typically null
            // since their biodata lives on the alumni record.
            'gender' => $this->gender,
            'phone' => $this->phone,
            'birth_date' => $this->birth_date?->toDateString(),
            'birthplace' => $this->birthplace,
            'birthplace_regency' => $this->birthplace_regency,
            'birthplace_province' => $this->birthplace_province,
            'address' => $this->address,
            // Requires eager-loading 'alumni.department' & 'alumni.graduationYear'
            // to avoid lazy N+1 queries (see AuthController load strings).
            'alumni' => $this->whenLoaded('alumni', fn () => $this->alumni ? [
                'id' => $this->alumni->id,
                'name' => $this->alumni->name,
                'nis_nim' => $this->alumni->nis_nim,
                'nisn' => $this->alumni->nisn,
                'socials' => $this->alumni->socials ?? [],
                'skills' => $this->alumni->skills ?? [],
                'gender' => $this->alumni->gender,
                'phone' => $this->alumni->phone,
                'birth_date' => $this->alumni->birth_date?->toDateString(),
                'birthplace' => $this->alumni->birthplace,
                'birthplace_regency' => $this->alumni->birthplace_regency,
                'birthplace_province' => $this->alumni->birthplace_province,
                'address' => $this->alumni->address,
                'department' => $this->alumni->department?->name,
                'graduation_year' => $this->alumni->graduationYear?->year,
                'birthplace_label' => $this->alumni->birthplace_label,
                'employment_status' => $this->alumni->employment_status,
                'company_name' => $this->alumni->company_name,
                'position' => $this->alumni->position,
                'business_field' => $this->alumni->business_field,
                'business_start_year' => $this->alumni->business_start_year,
                'location' => $this->alumni->location,
                'work_province' => $this->alumni->work_province,
                'work_city' => $this->alumni->work_city,
                'study_institution' => $this->alumni->study_institution,
                'study_program' => $this->alumni->study_program,
                'study_entry_year' => $this->alumni->study_entry_year,
                'business_name' => $this->alumni->business_name,
                'business_address' => $this->alumni->business_address,
                'business_province' => $this->alumni->business_province,
                'business_city' => $this->alumni->business_city,
            ] : null),
            'has_password' => (bool) $this->password,
            'is_active' => $this->is_active,
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
