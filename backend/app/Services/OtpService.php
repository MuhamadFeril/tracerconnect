<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * One-time password (OTP) helpers backed by the cache store.
 *
 * Codes are 6-digit, single-use, and expire after 10 minutes. They are keyed
 * by purpose (e.g. register, reset) + normalized email so different flows
 * never collide. Used for account verification at registration and for the
 * password reset flow.
 */
class OtpService
{
    public const TTL_SECONDS = 600;

    /**
     * Generate (and store) a fresh code for the given email + purpose.
     */
    public static function generate(string $email, string $purpose): string
    {
        $code = (string) random_int(100000, 999999);

        Cache::put(
            self::key($email, $purpose),
            $code,
            now()->addSeconds(self::TTL_SECONDS)
        );

        return $code;
    }

    /**
     * Check a submitted code (single use — consumed on success).
     */
    public static function verify(string $email, string $purpose, string $code): bool
    {
        $key = self::key($email, $purpose);
        $expected = Cache::get($key);

        if (! is_string($expected) || ! hash_equals($expected, $code)) {
            return false;
        }

        Cache::forget($key);

        return true;
    }

    private static function key(string $email, string $purpose): string
    {
        return 'otp:'.$purpose.':'.mb_strtolower(trim($email));
    }
}
