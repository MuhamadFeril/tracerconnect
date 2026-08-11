<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GraduationYearResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'year' => $this->year,
            'alumni_count' => $this->whenCounted('alumni'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
