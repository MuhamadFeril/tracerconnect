<?php

namespace App\Http\Requests\Announcement;

use App\Http\Requests\Concerns\ScopesToInstitution;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnnouncementRequest extends FormRequest
{
    use ScopesToInstitution;

    public function authorize(): bool
    {
        return $this->user()?->can('announcement.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->scopeToInstitution();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'institution_id' => $this->institutionIdRules(),
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'status' => ['required', 'string', Rule::in(['draft', 'published'])],
            'published_at' => ['nullable', 'date'],
        ];
    }
}
