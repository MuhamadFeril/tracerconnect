<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlumniResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'user_id' => $this->user_id,
            'nis_nim' => $this->nis_nim,
            'name' => $this->name,
            'gender' => $this->gender,
            'birth_date' => $this->birth_date?->toDateString(),
            'birthplace' => $this->birthplace,
            'birthplace_regency' => $this->birthplace_regency,
            'birthplace_province' => $this->birthplace_province,
            'birthplace_label' => $this->birthplace_label,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'department_id' => $this->department_id,
            'department' => $this->whenLoaded('department', fn () => $this->department?->name),
            'graduation_year_id' => $this->graduation_year_id,
            'graduation_year' => $this->whenLoaded('graduationYear', fn () => $this->graduationYear?->year),
            'employment_status' => $this->employment_status,
            'company_name' => $this->company_name,
            'position' => $this->position,
            'location' => $this->location,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
