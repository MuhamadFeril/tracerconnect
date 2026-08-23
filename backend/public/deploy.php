<?php

/**
 * TEMPORARY DEPLOY HELPER — DELETE THIS FILE IMMEDIATELY AFTER USE.
 *
 * InfinityFree has no SSH, so `php artisan migrate` / `storage:link`
 * cannot be run from a terminal. Open this script once in a browser:
 *
 *   https://traccerconnect.infinityfreeapp.com/deploy.php?token=YOUR_DEPLOY_TOKEN
 *
 * It will (1) create the public/storage symlink and (2) run migrations.
 * The script refuses to run unless DEPLOY_TOKEN in .env matches ?token=.
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';

$expected = getenv('DEPLOY_TOKEN');
$token = $_GET['token'] ?? '';

if (! $expected || ! hash_equals($expected, $token)) {
    http_response_code(403);
    echo 'Forbidden. Set DEPLOY_TOKEN in .env and pass it as ?token=';
    exit;
}

// Storage symlink (public/storage -> storage/app/public)
$target = __DIR__ . '/storage';
if (! file_exists($target)) {
    $ok = @symlink(__DIR__ . '/../storage/app/public', $target);
    echo $ok ? "storage symlink: OK\n" : "storage symlink: FAILED (symlink() disabled?)\n";
}

/** @var \Illuminate\Contracts\Console\Kernel $kernel */
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->call('migrate', ['--force' => true]);
echo "--- migrate output ---\n" . $kernel->output() . "\n";

echo "\nDONE. DELETE deploy.php NOW.\n";
