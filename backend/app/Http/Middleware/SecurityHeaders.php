<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $isProduction = app()->environment('production');

        // ── Standard Security Headers ──────────────────────────────────
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()');
        $response->headers->set('X-XSS-Protection', '0'); // Rely on CSP instead
        $response->headers->set('X-DNS-Prefetch-Control', 'off');

        if ($isProduction) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        // ── Content Security Policy ────────────────────────────────────
        $csp = $this->buildCsp($isProduction);
        $response->headers->set('Content-Security-Policy', $csp);

        // In production, also send Report-Only so violations are logged
        // without blocking resources while tuning the policy.
        if ($isProduction) {
            $response->headers->set('Content-Security-Policy-Report-Only', $csp);
        }

        return $response;
    }

    /**
     * Build the Content-Security-Policy header value.
     *
     * Production policy removes 'unsafe-eval' and tightens directives.
     * Development keeps 'unsafe-eval' for React/Vite HMR and allows
     * localhost origins for cross-port API calls.
     */
    private function buildCsp(bool $isProduction): string
    {
        // ── script-src ───────────────────────────────────────────────
        // Production: no unsafe-eval (React production build doesn't need it)
        // Development: keep unsafe-eval for Vite HMR / React DevTools
        $scriptSrc = $isProduction
            ? "'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com"
            : "'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com";

        // ── connect-src ──────────────────────────────────────────────
        // Production: only self + Google OAuth endpoints
        // Development: also allow localhost (any port) for cross-port API calls
        // (frontend on :5173, backend on :8000)
        $connectSrc = $isProduction
            ? "'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com"
            : "'self' http://localhost:* http://127.0.0.1:* https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com";

        $directives = [
            // Core
            "default-src 'self'",
            "script-src {$scriptSrc}",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  // unsafe-inline needed for Tailwind

            // Assets
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",

            // Network
            "connect-src {$connectSrc}",

            // Frames
            "frame-src https://accounts.google.com",
            "frame-ancestors 'none'",

            // Forms & Base
            "form-action 'self'",
            "base-uri 'self'",

            // Block plugins
            "object-src 'none'",
            "plugin-src 'none'",

            // Workers
            "worker-src 'self' blob:",
            "child-src 'self' blob:",

            // Manifest
            "manifest-src 'self'",
        ];

        if ($isProduction) {
            // Force HTTPS for all sub-resources
            $directives[] = 'upgrade-insecure-requests';

            // CSP violation reporting endpoint (implement /api/v1/csp-report)
            $reportUri = url('/api/v1/csp-report');
            $directives[] = "report-uri {$reportUri}";
            $directives[] = "report-to csp-endpoint";
        }

        return implode('; ', $directives);
    }
}
