<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| The React frontend is built into public/ and served by Laravel (single
| app on one domain — works locally and on shared hosting). API routes live
| under /api and are matched before this fallback, so valid ones are
| unaffected.
|
| To refresh the served frontend after changing the web app:
|   cd web && npm run build && cp -r dist/* ../backend/public/
|
*/

Route::fallback(function () {
    // Unknown /api/* paths must stay 404 so the API contract holds
    // (e.g. invalid export formats like /alumni/export/json), instead of
    // silently returning the SPA HTML with a 200.
    if (Str::startsWith(request()->path(), 'api/')) {
        abort(404);
    }

    // Any other URL renders the React app; client-side routing takes over.
    return File::get(public_path('index.html'));
});
