<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Flush cached auth guards before each HTTP request.
     *
     * In feature tests the application container is shared across every request
     * of a test, but the Sanctum RequestGuard caches the resolved user for the
     * lifetime of the guard instance. Without flushing, a token revoked by an
     * earlier request would still authenticate, and a different user's token
     * would be ignored. In production every request is a fresh process, so this
     * is only needed in tests.
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        $this->app['auth']->forgetGuards();

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }
}
