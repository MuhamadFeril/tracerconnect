<?php

// Google OAuth (login dengan Google / Google Identity Services).
// Daftar semua OAuth client ID milik project ini yang boleh menjadi audience
// ID token — Web + Android (debug & release). Token dari aplikasi Android bisa
// ber-audience client Android, bukan Web. Bisa dioverride via env koma:
// GOOGLE_ALLOWED_CLIENT_IDS="id1,id2".
$googleAllowedClientIds = array_values(array_filter(array_unique(array_map(
    'trim',
    explode(',', (string) env(
        'GOOGLE_ALLOWED_CLIENT_IDS',
        '399383365196-nloll6plpftp2q2fk5h9rn11qevqsejf.apps.googleusercontent.com,'
        .'399383365196-i99m7j9lb38ijtktro93ge9ar75jlfii.apps.googleusercontent.com,'
        .'399383365196-iu54mbmda1n9n615s7cmubimt7j663o3.apps.googleusercontent.com'
    ))
))));

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Google OAuth (login dengan Google / Google Identity Services).
    // Client ID wajib; secret hanya diperlukan untuk flow redirect OAuth.
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL', 'http://localhost:8000').'/api/v1/auth/google/callback'),
        'allowed_client_ids' => $googleAllowedClientIds,
    ],

];
