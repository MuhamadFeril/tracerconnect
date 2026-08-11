<?php

namespace App\Http\Requests\Event;

use App\Http\Requests\Concerns\ScopesToInstitution;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEventRequest extends FormRequest
{
    use ScopesToInstitution;

    public function authorize(): bool
    {
        return $this->user()?->can('event.create') ?? false;
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
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'status' => ['required', 'string', Rule::in(['draft', 'published'])],
        ];
    }
}
