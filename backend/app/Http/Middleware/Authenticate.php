<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * API requests are never redirected to a web login page; the exception
     * handler turns the unauthenticated state into a 401 JSON response.
     */
    protected function redirectTo(Request $request): ?string
    {
        return $request->is('api/*') ? null : parent::redirectTo($request);
    }
}
