<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SavedJobResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'job_vacancy_id' => $this->job_vacancy_id,
            'job' => $this->whenLoaded('jobVacancy', fn () => new JobVacancyResource($this->jobVacancy)),
            'created_at' => $this->created_at,
        ];
    }
}
