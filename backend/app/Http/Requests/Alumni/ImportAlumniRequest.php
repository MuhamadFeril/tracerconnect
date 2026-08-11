<?php

namespace App\Http\Requests\Alumni;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ImportAlumniRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('alumni.import') ?? false;
    }

    /**
     * Institution-scoped users always import into their own institution.
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

        return [
            'institution_id' => [
                'required', 'uuid', Rule::exists('institutions', 'id'),
                Rule::when(! $user->hasRole('super_admin'), Rule::in([$user->institution_id])),
            ],
            'file' => ['required', 'file', 'mimetypes:text/plain,text/csv,application/csv,application/vnd.ms-excel,application/octet-stream', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'institution_id.required' => 'Institusi wajib dipilih',
            'institution_id.exists' => 'Institusi tidak ditemukan',
            'file.required' => 'File CSV wajib diunggah',
            'file.mimetypes' => 'File harus berformat CSV',
            'file.max' => 'Ukuran file maksimal 2 MB',
        ];
    }
}
