<?php

use App\Http\Middleware\Authenticate;
use App\Http\Middleware\SecurityHeaders;
use App\Support\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API-first app: auth failures never redirect to a web login route.
        $middleware->alias([
            'auth' => Authenticate::class,
            // Override alias `throttle` bawaan: request mobile terautentikasi
            // (X-Platform: mobile + bearer token) bebas rate limit.
            'throttle' => \App\Http\Middleware\SkipThrottleForMobile::class,
        ]);

        // Force HTTPS in production and set HSTS header.
        $middleware->append(\Illuminate\Http\Middleware\TrustProxies::class);
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);
        $middleware->append(SecurityHeaders::class);

        // ⭐ KHUSUS VERCEL: Trust semua proxy (karena Vercel pake reverse proxy)
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Render unauthenticated and validation errors using the standard API error envelope.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error('Unauthenticated. Silakan login terlebih dahulu.', [], 401);
            }
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error('Validasi gagal', $e->errors(), 422);
            }
        });

        // Rate limit (429) harus memakai envelope API standar
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error('Terlalu banyak percobaan. Silakan tunggu sebentar lalu coba lagi.', [], 429);
            }
        });
    })->create();