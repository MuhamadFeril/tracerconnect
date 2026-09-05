<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SendOtp extends Notification
{
    public function __construct(
        public string $code,
        public string $purpose,
    ) {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = match ($this->purpose) {
            'reset' => 'Kode OTP Reset Password TracerAlumni',
            'password_change' => 'Kode OTP Ganti Password TracerAlumni',
            default => 'Kode OTP Verifikasi Akun TracerAlumni',
        };

        $line = match ($this->purpose) {
            'reset' => 'Anda menerima email ini karena kami menerima permintaan reset password untuk akun Anda.',
            'password_change' => 'Anda menerima email ini karena kami menerima permintaan ganti password untuk akun Anda.',
            default => 'Terima kasih telah mendaftar di TracerAlumni. Gunakan kode berikut untuk memverifikasi akun Anda.',
        };

        return (new MailMessage)
            ->subject($subject)
            ->greeting('Halo!')
            ->line($line)
            ->line('Kode OTP Anda: **'.$this->code.'**')
            ->line('Kode ini berlaku selama 10 menit dan hanya bisa digunakan sekali.')
            ->line('Jika Anda tidak merasa melakukannya, abaikan email ini.');
    }
}
