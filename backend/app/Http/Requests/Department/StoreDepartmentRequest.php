<?php

namespace App\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('department.create') ?? false;
    }

    /**
     * Institution-scoped users are always placed inside their own institution.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();

        if ($user && ! $user->hasRole('super_admin')) {
            $this->merge(['institution_id' => $user->institution_id]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();
        $institutionId = $this->input('institution_id', $user->institution_id);

        return [
            'institution_id' => [
                'required', 'uuid', Rule::exists('institutions', 'id'),
                Rule::when(! $user->hasRole('super_admin'), Rule::in([$user->institution_id])),
            ],
            'name' => ['required', 'string', 'max:255', Rule::unique('departments', 'name')->where('institution_id', $institutionId)],
            'code' => ['nullable', 'string', 'max:50'],
        ];
    }
}
