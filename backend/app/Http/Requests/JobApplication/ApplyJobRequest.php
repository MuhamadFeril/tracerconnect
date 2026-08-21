<?php

namespace App\Http\Requests\JobApplication;

use Illuminate\Foundation\Http\FormRequest;

class ApplyJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('job.apply') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cover_letter' => ['nullable', 'string', 'max:5000'],
            'cv' => ['nullable', 'file', 'mimetypes:application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'max:5120'],
            'portfolio' => ['nullable', 'file', 'mimetypes:application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png', 'mimes:pdf,doc,docx,jpg,jpeg,png', 'max:5120'],
        ];
    }
}
