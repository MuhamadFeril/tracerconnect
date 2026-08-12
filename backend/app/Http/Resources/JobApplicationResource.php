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
            'job' => $this->whenLoaded('jobVacancy', fn () => [
                'id' => $this->jobVacancy->id,
                'title' => $this->jobVacancy->title,
                'company_name' => $this->jobVacancy->company_name,
                'employment_type' => $this->jobVacancy->employment_type,
                'location' => $this->jobVacancy->location,
                'status' => $this->jobVacancy->status,
            ]),
            'applicant' => $this->whenLoaded('applicant', fn () => [
                'id' => $this->applicant->id,
                'name' => $this->applicant->name,
                'email' => $this->applicant->email,
            ]),
            'message' => $this->message,
            'status' => $this->status,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
