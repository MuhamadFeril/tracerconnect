<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobApplicationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'job_vacancy_id' => $this->job_vacancy_id,
            'user_id' => $this->user_id,
            'status' => $this->status,
            'cover_letter' => $this->cover_letter,
            'cv_data' => $this->cv_data,
            'cv_path' => $this->cv_path,
            'portfolio_path' => $this->portfolio_path,
            'applied_at' => $this->applied_at,
            'vacancy' => $this->whenLoaded('vacancy', fn () => [
                'id' => $this->vacancy->id,
                'title' => $this->vacancy->title,
                'company_name' => $this->vacancy->company_name,
                'employment_type' => $this->vacancy->employment_type,
                'location' => $this->vacancy->location,
            ]),
            'alumni' => $this->whenLoaded('alumni', fn () => $this->alumni ? [
                'id' => $this->alumni->id,
                'name' => $this->alumni->name,
                'department' => $this->alumni->department?->name,
                'graduation_year' => $this->alumni->graduationYear?->year,
                'employment_status' => $this->alumni->employment_status,
            ] : null),
            // Hiring result recorded by the employer when the application is
            // accepted (load with 'acceptance').
            'acceptance' => $this->whenLoaded('acceptance', fn () => $this->acceptance ? [
                'id' => $this->acceptance->id,
                'position_offered' => $this->acceptance->position_offered,
                'contract_type' => $this->acceptance->contract_type,
                'start_date' => $this->acceptance->start_date?->format('Y-m-d'),
                'salary' => $this->acceptance->salary,
                'notes' => $this->acceptance->notes,
                'decided_by' => $this->acceptance->decided_by,
                'decided_at' => $this->acceptance->decided_at,
            ] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
