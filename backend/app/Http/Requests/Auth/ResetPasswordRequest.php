<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'otp' => ['required', 'string', 'size:6', 'regex:/^\d{6}$/'],
            'password' => ['required', 'string', 'min:8', 'confirmed', function (string $attribute, mixed $value, \Closure $fail) {
                if (! preg_match('/[A-Z]/', $value)) {
                    $fail('Password harus mengandung minimal satu huruf besar.');
                }
                if (! preg_match('/[0-9]/', $value)) {
                    $fail('Password harus mengandung minimal satu angka.');
                }
                if (! preg_match('/[^A-Za-z0-9]/', $value)) {
                    $fail('Password harus mengandung minimal satu simbol.');
                }
            }],
        ];
    }
}
