<?php

namespace App\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('department.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $department = $this->route('department');

        return [
            'name' => ['sometimes', 'string', 'max:255', Rule::unique('departments', 'name')
                ->where('institution_id', $department->institution_id)
                ->ignore($department->id)],
            'code' => ['nullable', 'string', 'max:50'],
            'institution_id' => ['prohibited'],
        ];
    }
}
