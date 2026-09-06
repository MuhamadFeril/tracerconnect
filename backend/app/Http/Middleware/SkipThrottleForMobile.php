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

    /**
     * Batasi kuota per (identitas + route), bukan per identitas saja.
     *
     * Middleware throttle shorthand Laravel (`throttle:60,1`) memakai
     * user id (atau IP) sebagai satu-satunya kunci, sehingga SEMUA endpoint
     * yang di-throttle berbagi satu counter per pengguna. Akibatnya aktivitas
     * ringan — buka halaman, polling notifikasi, dan request GET lain yang
     * dibatasi 60/menit — ikut menguras kuota aksi berbatas rendah seperti
     * kirim lamaran (`throttle:10,1`) dan memunculkan 429 palsu saat user
     * hendak melamar pekerjaan.
     *
     * Dengan menambahkan segmen route (METHOD + URI) ke kunci, setiap
     * endpoint punya counter sendiri sehingga aksi-aksi yang berbeda tidak
     * saling memblokir.
     */
    protected function resolveRequestSignature($request)
    {
        $route = $request->route();
        $scope = ($route ? $route->uri() : $request->path()).'|'.$request->method();

        if ($user = $request->user()) {
            $identity = (string) $user->getAuthIdentifier();
        } elseif ($route) {
            $identity = $route->getDomain().'|'.$request->ip();
        } else {
            $identity = (string) $request->ip();
        }

        $value = $identity.'|'.$scope;

        return self::$shouldHashKeys ? sha1($value) : $value;
    }
}
