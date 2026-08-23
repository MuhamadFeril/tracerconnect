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
            'cv_data' => ['nullable', 'array'],
            'cv_data.full_name' => ['nullable', 'string', 'max:255'],
            'cv_data.email' => ['nullable', 'email', 'max:255'],
            'cv_data.phone' => ['nullable', 'string', 'max:50'],
            'cv_data.gender' => ['nullable', 'string', 'in:male,female'],
            'cv_data.birth_date' => ['nullable', 'string', 'max:50'],
            'cv_data.birthplace' => ['nullable', 'string', 'max:255'],
            'cv_data.address' => ['nullable', 'string', 'max:500'],
            'cv_data.department' => ['nullable', 'string', 'max:255'],
            'cv_data.graduation_year' => ['nullable', 'string', 'max:10'],
            'cv_data.education' => ['nullable', 'string', 'max:255'],
            'cv_data.skills' => ['nullable', 'array'],
            'cv_data.skills.*' => ['string', 'max:100'],
            'cv_data.experience' => ['nullable', 'string', 'max:2000'],
            'cv_data.interests' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
