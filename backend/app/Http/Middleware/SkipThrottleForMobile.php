<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;

/**
 * Pengganti middleware `throttle:` bawaan Laravel.
 *
 * Request dari aplikasi mobile (header `X-Platform: mobile`) yang sudah
 * terautentikasi (memuat bearer token) **dilewati** dari rate limiting,
 * sehingga polling chat/beranda dan aktivitas normal pengguna mobile tidak
 * pernah tertahan 429.
 *
 * Endpoint publik (login, register, OTP, lupa password) TETAP dibatasi
 * meski berasal dari mobile — di sanalah titik abuse/brute force, jadi
 * proteksinya dipertahankan.
 */
class SkipThrottleForMobile extends ThrottleRequests
{
    public function handle($request, Closure $next, $maxAttempts = 60, $decayMinutes = 1, $prefix = '') // @phpstan-ignore-line
    {
        if ($request->header('X-Platform') === 'mobile' && $request->bearerToken()) {
            return $next($request);
        }

        return parent::handle($request, $next, $maxAttempts, $decayMinutes, $prefix);
    }
}
