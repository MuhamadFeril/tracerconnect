<?php

use App\Http\Controllers\Api\V1\AlumniController;
use App\Http\Controllers\Api\V1\AlumniPortalController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CspReportController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\DataQualityController;
use App\Http\Controllers\Api\V1\EmployerAlumniController;
use App\Http\Controllers\Api\V1\InstitutionBrandingController;
use App\Http\Controllers\Api\V1\EmployerController;
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
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:15,1');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
        Route::post('google', [AuthController::class, 'googleLogin'])->middleware('throttle:10,1');
        Route::get('google', [GoogleAuthController::class, 'redirect']);
        Route::get('google/callback', [GoogleAuthController::class, 'callback'])->middleware('throttle:10,1');
        Route::post('google/exchange', [GoogleAuthController::class, 'exchange'])->middleware('throttle:10,1');
        Route::post('verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
        Route::post('resend-otp', [AuthController::class, 'resendOtp'])->middleware('throttle:5,1');
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
        Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    });

    // CSP violation reports (browser sends automatically on policy violations)
    Route::post('csp-report', [CspReportController::class, 'store'])->middleware('throttle:60,1');

    Route::get('institution/{institutionId}/branding', [InstitutionBrandingController::class, 'publicBranding'])->middleware('throttle:60,1');
        // Public data needed by the registration form.
    Route::get('universities', [UniversityController::class, 'index'])->middleware('throttle:60,1');
    Route::get('universities/{university}/study-programs', [UniversityController::class, 'studyPrograms'])->middleware('throttle:60,1');
    Route::get('institutions/options', [InstitutionController::class, 'options'])->middleware('throttle:60,1');
    Route::get('institutions/{institutionId}/departments', [InstitutionController::class, 'departments'])->middleware('throttle:60,1');
    Route::get('regions/provinces', [RegionController::class, 'provinces'])->middleware('throttle:60,1');
    Route::get('regions/provinces/{province}/regencies', [RegionController::class, 'regencies'])->middleware('throttle:60,1');
    Route::get('regions/regencies/{regency}/districts', [RegionController::class, 'districts'])->middleware('throttle:60,1');
    Route::get('regions/districts/{district}/villages', [RegionController::class, 'villages'])->middleware('throttle:60,1');

    // Authenticated endpoints
    Route::middleware('auth:sanctum')->group(function () {
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout'])->middleware('throttle:60,1');
            Route::get('me', [AuthController::class, 'me'])->middleware('throttle:60,1');
            Route::put('profile', [AuthController::class, 'updateProfile'])->middleware('throttle:30,1');
            Route::put('password', [AuthController::class, 'updatePassword'])->middleware('throttle:10,1');
            // Change password via email OTP (no current password needed).
            Route::post('password/otp', [AuthController::class, 'sendPasswordChangeOtp'])->middleware('throttle:3,1');
            Route::put('password/otp', [AuthController::class, 'changePasswordWithOtp'])->middleware('throttle:5,1');
            Route::post('me/avatar', [AuthController::class, 'uploadAvatar'])->middleware('throttle:10,1');
            Route::delete('me/avatar', [AuthController::class, 'deleteAvatar'])->middleware('throttle:10,1');
        });

        Route::get('roles', [RoleController::class, 'index'])->middleware('throttle:60,1');
        Route::get('permissions', [PermissionController::class, 'index'])->middleware('throttle:60,1');

        Route::apiResource('institutions', InstitutionController::class)->middleware('throttle:60,1');
        // Institution branding
        Route::get('institution-branding', [InstitutionBrandingController::class, 'show'])->middleware('throttle:30,1');
        Route::put('institution-branding', [InstitutionBrandingController::class, 'update'])->middleware('throttle:10,1');
        Route::post('institution-branding/logo', [InstitutionBrandingController::class, 'uploadLogo'])->middleware('throttle:5,1');
        Route::post('institution-branding/cover', [InstitutionBrandingController::class, 'uploadCover'])->middleware('throttle:5,1');
        Route::delete('institution-branding/logo', [InstitutionBrandingController::class, 'deleteLogo'])->middleware('throttle:5,1');
        Route::apiResource('users', UserController::class)->middleware('throttle:60,1');
        Route::apiResource('departments', DepartmentController::class)->middleware('throttle:60,1');
        Route::apiResource('graduation-years', GraduationYearController::class)->middleware('throttle:60,1');

        // Must be registered before apiResource('alumni') so {alumnus} binding
        // never captures 'export' / 'import' / 'home' / 'surveys'.
        Route::get('alumni/home', [AlumniPortalController::class, 'home'])->middleware('throttle:60,1');
        Route::get('alumni/surveys', [AlumniPortalController::class, 'surveys'])->middleware('throttle:60,1');
        Route::get('alumni/export', [AlumniController::class, 'export'])->middleware('throttle:10,1');
        Route::post('alumni/import', [AlumniController::class, 'import'])->middleware('throttle:5,1');
        Route::apiResource('alumni', AlumniController::class)->middleware('throttle:60,1');

        // Questionnaire engine (phase 4)
        Route::apiResource('surveys', SurveyController::class)->middleware('throttle:60,1');
        Route::post('surveys/{survey}/publish', [SurveyController::class, 'publish'])->middleware('throttle:30,1');
        Route::post('surveys/{survey}/unpublish', [SurveyController::class, 'unpublish'])->middleware('throttle:30,1');
        Route::put('surveys/{survey}/reorder', [SurveyController::class, 'reorder'])->middleware('throttle:30,1');
        Route::post('surveys/{survey}/sections', [SurveySectionController::class, 'store'])->middleware('throttle:30,1');
        Route::put('survey-sections/{survey_section}', [SurveySectionController::class, 'update'])->middleware('throttle:30,1');
        Route::delete('survey-sections/{survey_section}', [SurveySectionController::class, 'destroy'])->middleware('throttle:30,1');
        Route::post('surveys/{survey}/questions', [QuestionController::class, 'store'])->middleware('throttle:30,1');
        Route::put('questions/{question}', [QuestionController::class, 'update'])->middleware('throttle:30,1');
        Route::delete('questions/{question}', [QuestionController::class, 'destroy'])->middleware('throttle:30,1');

        // Tracer response (phase 5)
        Route::get('responses/my', [ResponseController::class, 'my'])->middleware('throttle:60,1');
        Route::get('responses', [ResponseController::class, 'index'])->middleware('throttle:60,1');
        Route::get('responses/{response}', [ResponseController::class, 'show'])->middleware('throttle:60,1');
        Route::delete('responses/{response}', [ResponseController::class, 'destroy'])->middleware('throttle:30,1');
        Route::post('surveys/{survey}/start', [ResponseController::class, 'start'])->middleware('throttle:30,1');
        Route::post('surveys/{survey}/responses/save', [ResponseController::class, 'save'])->middleware('throttle:30,1');
        Route::post('surveys/{survey}/responses/submit', [ResponseController::class, 'submit'])->middleware('throttle:30,1');

        // Data Quality Center
        Route::get('data-quality', [DataQualityController::class, 'index'])->middleware('throttle:30,1');

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
        Route::apiResource('announcements', AnnouncementController::class)->middleware('throttle:60,1');
        Route::apiResource('events', EventController::class)->middleware('throttle:60,1');
        Route::post('events/{event}/register', [EventController::class, 'register'])->middleware('throttle:30,1');
        Route::delete('events/{event}/register', [EventController::class, 'unregister'])->middleware('throttle:30,1');
        Route::get('events/{event}/participants', [EventController::class, 'participants'])->middleware('throttle:60,1');
        Route::post('events/{event}/participants/{registration}/attendance', [EventController::class, 'markAttended'])->middleware('throttle:30,1');
        Route::apiResource('job-vacancies', JobVacancyController::class)->middleware('throttle:60,1');

        // Job applications + bookmarks (phase 8)
        Route::get('applications/my', [JobApplicationController::class, 'my'])->middleware('throttle:60,1');
        Route::post('job-vacancies/{job_vacancy}/apply', [JobApplicationController::class, 'apply'])->middleware('throttle:10,1');
        Route::post('job-vacancies/{job_vacancy}/bookmark', [JobApplicationController::class, 'bookmark'])->middleware('throttle:30,1');
        Route::delete('job-vacancies/{job_vacancy}/bookmark', [JobApplicationController::class, 'unbookmark'])->middleware('throttle:30,1');
        Route::get('job-vacancies/{job_vacancy}/applications', [JobApplicationController::class, 'index'])->middleware('throttle:60,1');
        Route::get('applications/{application}', [JobApplicationController::class, 'show'])->middleware('throttle:60,1');
        Route::post('applications/{application}/withdraw', [JobApplicationController::class, 'withdraw'])->middleware('throttle:10,1');
        Route::put('applications/{application}/status', [JobApplicationController::class, 'updateStatus'])->middleware('throttle:30,1');
        Route::put('applications/{application}/acceptance', [JobApplicationController::class, 'saveAcceptance'])->middleware('throttle:30,1');

        // Employer self-service portal (dashboard + unified applicant inbox).
        Route::prefix('employer')->group(function () {
            Route::get('dashboard', [EmployerController::class, 'dashboard'])->middleware('throttle:30,1');
            Route::get('applications', [EmployerController::class, 'applications'])->middleware('throttle:60,1');
            Route::get('applications/{application}/cv', [EmployerAlumniController::class, 'downloadApplicationCv'])->middleware('throttle:30,1');
            Route::get('alumni', [EmployerAlumniController::class, 'index'])->middleware('throttle:60,1');
            Route::get('alumni/{alumniId}', [EmployerAlumniController::class, 'show'])->middleware('throttle:60,1');
        });

        // Notifications (phase 10)
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->middleware('throttle:60,1');
            Route::get('unread-count', [NotificationController::class, 'unreadCount'])->middleware('throttle:60,1');
            Route::post('read-all', [NotificationController::class, 'markAllRead'])->middleware('throttle:30,1');
            Route::post('{notification}/read', [NotificationController::class, 'markRead'])->middleware('throttle:30,1');
        });

        // Chat (career chat, phase 9 — REST polling transport)
        // Registered before {conversation} so the literal segment is never
        // treated as a conversation UUID.
        Route::get('conversations/unread-count', [ChatController::class, 'unreadCount'])->middleware('throttle:60,1');
        Route::get('conversations', [ChatController::class, 'index'])->middleware('throttle:60,1');
        Route::post('conversations', [ChatController::class, 'store'])->middleware('throttle:20,1');
        Route::get('conversations/{conversation}', [ChatController::class, 'show'])->middleware('throttle:60,1');
        Route::get('conversations/{conversation}/messages', [ChatController::class, 'messages'])->middleware('throttle:60,1');
        Route::post('conversations/{conversation}/messages', [ChatController::class, 'send'])->middleware('throttle:60,1');
        Route::delete('messages/{message}', [ChatController::class, 'destroyMessage'])->middleware('throttle:30,1');
        Route::post('conversations/{conversation}/read', [ChatController::class, 'markRead'])->middleware('throttle:30,1');
        Route::post('conversations/{conversation}/mute', [ChatController::class, 'mute'])->middleware('throttle:30,1');
        Route::post('conversations/{conversation}/report', [ChatController::class, 'report'])->middleware('throttle:10,1');

        // Networking (phase 12)
        Route::prefix('networking')->group(function () {
            Route::get('alumni', [NetworkingController::class, 'alumni'])->middleware('throttle:60,1');
            Route::get('alumni/{alumnus}', [NetworkingController::class, 'show'])->middleware('throttle:60,1');
            Route::get('connections', [NetworkingController::class, 'connections'])->middleware('throttle:60,1');
            Route::get('requests', [NetworkingController::class, 'requests'])->middleware('throttle:60,1');
            Route::post('connections', [NetworkingController::class, 'store'])->middleware('throttle:10,1');
            Route::post('connections/{connection}/accept', [NetworkingController::class, 'accept'])->middleware('throttle:10,1');
            Route::post('connections/{connection}/reject', [NetworkingController::class, 'reject'])->middleware('throttle:10,1');
            Route::delete('connections/{connection}', [NetworkingController::class, 'destroy'])->middleware('throttle:10,1');
            Route::get('blocked', [NetworkingController::class, 'blocked'])->middleware('throttle:60,1');
            Route::delete('blocked/{blockedUser}', [NetworkingController::class, 'unblock'])->middleware('throttle:10,1');
            Route::post('block', [NetworkingController::class, 'block'])->middleware('throttle:10,1');
            Route::post('report', [NetworkingController::class, 'report'])->middleware('throttle:10,1');
        });
    });
});
