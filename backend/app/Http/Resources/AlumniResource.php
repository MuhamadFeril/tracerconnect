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
            'business_field' => $this->business_field,
            'business_start_year' => $this->business_start_year,
            'location' => $this->location,
            'work_province' => $this->work_province,
            'work_city' => $this->work_city,
            'study_institution' => $this->study_institution,
            'study_program' => $this->study_program,
            'study_entry_year' => $this->study_entry_year,
            'business_name' => $this->business_name,
            'business_address' => $this->business_address,
            'business_province' => $this->business_province,
            'business_city' => $this->business_city,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
