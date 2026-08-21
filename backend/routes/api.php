<?php

use App\Http\Controllers\Api\V1\AlumniController;
use App\Http\Controllers\Api\V1\AlumniPortalController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\GoogleAuthController;
use App\Http\Controllers\Api\V1\GraduationYearController;
use App\Http\Controllers\Api\V1\JobApplicationController;
use App\Http\Controllers\Api\V1\JobVacancyController;
use App\Http\Controllers\Api\V1\InstitutionController;
use App\Http\Controllers\Api\V1\NetworkingController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\QuestionController;
use App\Http\Controllers\Api\V1\RegionController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SuccessStoryController;
use App\Http\Controllers\Api\V1\ResponseController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SurveyController;
use App\Http\Controllers\Api\V1\SurveySectionController;
use App\Http\Controllers\Api\V1\UniversityController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Base path: /api/v1
|
*/

Route::prefix('v1')->group(function () {
    // Public endpoints
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
        Route::post('google', [AuthController::class, 'googleLogin'])->middleware('throttle:10,1');
        Route::get('google', [GoogleAuthController::class, 'redirect'])->middleware('throttle:5,1');
        Route::get('google/callback', [GoogleAuthController::class, 'callback'])->middleware('throttle:10,1');
        Route::post('google/exchange', [GoogleAuthController::class, 'exchange'])->middleware('throttle:10,1');
        Route::post('verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:5,1');
        Route::post('resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:3,1');
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
        Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    });

    // Public data needed by the registration form.
    Route::get('universities', [UniversityController::class, 'index'])->middleware('throttle:60,1');
    Route::get('universities/{university}/study-programs', [UniversityController::class, 'studyPrograms'])->middleware('throttle:60,1');
    Route::get('institutions/options', [InstitutionController::class, 'options'])->middleware('throttle:60,1');
    Route::get('regions/provinces', [RegionController::class, 'provinces'])->middleware('throttle:60,1');
    Route::get('regions/provinces/{province}/regencies', [RegionController::class, 'regencies'])->middleware('throttle:60,1');
    Route::get('regions/regencies/{regency}/districts', [RegionController::class, 'districts'])->middleware('throttle:60,1');
    Route::get('regions/districts/{district}/villages', [RegionController::class, 'villages'])->middleware('throttle:60,1');

    // Authenticated endpoints
    Route::middleware('auth:sanctum')->group(function () {
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::put('profile', [AuthController::class, 'updateProfile']);
            Route::put('password', [AuthController::class, 'updatePassword']);
            // Change password via email OTP (no current password needed).
            Route::post('password/otp', [AuthController::class, 'sendPasswordChangeOtp'])->middleware('throttle:3,1');
            Route::put('password/otp', [AuthController::class, 'changePasswordWithOtp'])->middleware('throttle:5,1');
            Route::post('me/avatar', [AuthController::class, 'uploadAvatar']);
            Route::delete('me/avatar', [AuthController::class, 'deleteAvatar']);
        });

        Route::get('roles', [RoleController::class, 'index']);
        Route::get('permissions', [PermissionController::class, 'index']);

        Route::apiResource('institutions', InstitutionController::class);
        Route::apiResource('users', UserController::class);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('graduation-years', GraduationYearController::class);

        // Must be registered before apiResource('alumni') so {alumnus} binding
        // never captures 'export' / 'import' / 'home' / 'surveys'.
        Route::get('alumni/home', [AlumniPortalController::class, 'home']);
        Route::get('alumni/surveys', [AlumniPortalController::class, 'surveys']);
        Route::get('alumni/export', [AlumniController::class, 'export'])->middleware('throttle:10,1');
        Route::post('alumni/import', [AlumniController::class, 'import'])->middleware('throttle:5,1');
        Route::apiResource('alumni', AlumniController::class);

        // Questionnaire engine (phase 4)
        Route::apiResource('surveys', SurveyController::class);
        Route::post('surveys/{survey}/publish', [SurveyController::class, 'publish']);
        Route::post('surveys/{survey}/unpublish', [SurveyController::class, 'unpublish']);
        Route::put('surveys/{survey}/reorder', [SurveyController::class, 'reorder']);
        Route::post('surveys/{survey}/sections', [SurveySectionController::class, 'store']);
        Route::put('survey-sections/{survey_section}', [SurveySectionController::class, 'update']);
        Route::delete('survey-sections/{survey_section}', [SurveySectionController::class, 'destroy']);
        Route::post('surveys/{survey}/questions', [QuestionController::class, 'store']);
        Route::put('questions/{question}', [QuestionController::class, 'update']);
        Route::delete('questions/{question}', [QuestionController::class, 'destroy']);

        // Tracer response (phase 5)
        Route::get('responses/my', [ResponseController::class, 'my']);
        Route::get('responses', [ResponseController::class, 'index']);
        Route::get('responses/{response}', [ResponseController::class, 'show']);
        Route::delete('responses/{response}', [ResponseController::class, 'destroy']);
        Route::post('surveys/{survey}/start', [ResponseController::class, 'start']);
        Route::post('surveys/{survey}/responses/save', [ResponseController::class, 'save']);
        Route::post('surveys/{survey}/responses/submit', [ResponseController::class, 'submit']);

        // Analytics (phase 6, consumed by the React admin dashboard)
        Route::get('analytics/overview', [AnalyticsController::class, 'overview'])->middleware('throttle:30,1');
        Route::get('analytics/employment', [AnalyticsController::class, 'employment'])->middleware('throttle:30,1');
        Route::get('analytics/surveys/{survey}/results', [AnalyticsController::class, 'surveyResults'])->middleware('throttle:30,1');

        // Reports (phase 7)
        Route::prefix('reports')->group(function () {
            Route::get('executive-summary', [ReportController::class, 'executiveSummary'])->middleware('throttle:30,1');
            Route::get('executive-summary/pdf', [ReportController::class, 'executiveSummaryPdf'])->middleware('throttle:10,1');
            Route::get('tracer/pdf', [ReportController::class, 'tracerPdf'])->middleware('throttle:10,1');
            Route::get('alumni/export/{format}', [ReportController::class, 'alumniExport'])
                ->whereIn('format', ['csv', 'xlsx'])->middleware('throttle:10,1');
            Route::get('surveys/{survey}/results/export/{format}', [ReportController::class, 'surveyResultsExport'])
                ->whereIn('format', ['csv', 'xlsx'])->middleware('throttle:10,1');
        });

        // Engagement (phase 10)
        Route::apiResource('announcements', AnnouncementController::class);
        Route::apiResource('success-stories', SuccessStoryController::class);
        Route::apiResource('events', EventController::class);
        Route::post('events/{event}/register', [EventController::class, 'register']);
        Route::delete('events/{event}/register', [EventController::class, 'unregister']);
        Route::get('events/{event}/participants', [EventController::class, 'participants']);
        Route::post('events/{event}/participants/{registration}/attendance', [EventController::class, 'markAttended']);
        Route::apiResource('job-vacancies', JobVacancyController::class);

        // Job applications + bookmarks (phase 8)
        Route::get('applications/my', [JobApplicationController::class, 'my']);
        Route::post('job-vacancies/{job_vacancy}/apply', [JobApplicationController::class, 'apply']);
        Route::post('job-vacancies/{job_vacancy}/bookmark', [JobApplicationController::class, 'bookmark']);
        Route::delete('job-vacancies/{job_vacancy}/bookmark', [JobApplicationController::class, 'unbookmark']);
        Route::get('job-vacancies/{job_vacancy}/applications', [JobApplicationController::class, 'index']);
        Route::get('applications/{application}', [JobApplicationController::class, 'show']);
        Route::post('applications/{application}/withdraw', [JobApplicationController::class, 'withdraw']);
        Route::put('applications/{application}/status', [JobApplicationController::class, 'updateStatus']);
        Route::put('applications/{application}/acceptance', [JobApplicationController::class, 'saveAcceptance']);

        // Notifications (phase 10)
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('unread-count', [NotificationController::class, 'unreadCount']);
            Route::post('read-all', [NotificationController::class, 'markAllRead']);
            Route::post('{notification}/read', [NotificationController::class, 'markRead']);
        });

        // Chat (career chat, phase 9 — REST polling transport)
        // Registered before {conversation} so the literal segment is never
        // treated as a conversation UUID.
        Route::get('conversations/unread-count', [ChatController::class, 'unreadCount']);
        Route::get('conversations', [ChatController::class, 'index']);
        Route::post('conversations', [ChatController::class, 'store'])->middleware('throttle:20,1');
        Route::get('conversations/{conversation}', [ChatController::class, 'show']);
        Route::get('conversations/{conversation}/messages', [ChatController::class, 'messages']);
        Route::post('conversations/{conversation}/messages', [ChatController::class, 'send'])->middleware('throttle:60,1');
        Route::delete('messages/{message}', [ChatController::class, 'destroyMessage']);
        Route::post('conversations/{conversation}/read', [ChatController::class, 'markRead']);
        Route::post('conversations/{conversation}/mute', [ChatController::class, 'mute']);
        Route::post('conversations/{conversation}/report', [ChatController::class, 'report'])->middleware('throttle:10,1');

        // Networking (phase 12)
        Route::prefix('networking')->group(function () {
            Route::get('alumni', [NetworkingController::class, 'alumni']);
            Route::get('alumni/{alumnus}', [NetworkingController::class, 'show']);
            Route::get('connections', [NetworkingController::class, 'connections']);
            Route::get('requests', [NetworkingController::class, 'requests']);
            Route::post('connections', [NetworkingController::class, 'store']);
            Route::post('connections/{connection}/accept', [NetworkingController::class, 'accept']);
            Route::post('connections/{connection}/reject', [NetworkingController::class, 'reject']);
            Route::delete('connections/{connection}', [NetworkingController::class, 'destroy']);
            Route::get('blocked', [NetworkingController::class, 'blocked']);
            Route::delete('blocked/{blockedUser}', [NetworkingController::class, 'unblock']);
            Route::post('block', [NetworkingController::class, 'block']);
            Route::post('report', [NetworkingController::class, 'report']);
        });
    });
});
