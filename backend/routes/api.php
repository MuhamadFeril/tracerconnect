<?php

use App\Http\Controllers\Api\V1\AlumniController;
use App\Http\Controllers\Api\V1\AlumniPortalController;
use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AnnouncementController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\EventController;
use App\Http\Controllers\Api\V1\GraduationYearController;
use App\Http\Controllers\Api\V1\JobVacancyController;
use App\Http\Controllers\Api\V1\InstitutionController;
use App\Http\Controllers\Api\V1\JobApplicationController;
use App\Http\Controllers\Api\V1\SavedJobController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\QuestionController;
use App\Http\Controllers\Api\V1\RegionController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\ResponseController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SurveyController;
use App\Http\Controllers\Api\V1\SurveySectionController;
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
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');
        Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
    });

    // Public data needed by the registration form.
    Route::get('institutions/options', [InstitutionController::class, 'options']);
    Route::get('regions/provinces', [RegionController::class, 'provinces']);
    Route::get('regions/provinces/{province}/regencies', [RegionController::class, 'regencies']);
    Route::get('regions/regencies/{regency}/districts', [RegionController::class, 'districts']);

    // Authenticated endpoints
    Route::middleware('auth:sanctum')->group(function () {
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::put('profile', [AuthController::class, 'updateProfile']);
            Route::put('password', [AuthController::class, 'updatePassword']);
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
        Route::get('alumni/export', [AlumniController::class, 'export']);
        Route::post('alumni/import', [AlumniController::class, 'import']);
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
        Route::get('analytics/overview', [AnalyticsController::class, 'overview']);
        Route::get('analytics/employment', [AnalyticsController::class, 'employment']);
        Route::get('analytics/surveys/{survey}/results', [AnalyticsController::class, 'surveyResults']);

        // Reports (phase 7)
        Route::prefix('reports')->group(function () {
            Route::get('executive-summary', [ReportController::class, 'executiveSummary']);
            Route::get('executive-summary/pdf', [ReportController::class, 'executiveSummaryPdf']);
            Route::get('tracer/pdf', [ReportController::class, 'tracerPdf']);
            Route::get('alumni/export/{format}', [ReportController::class, 'alumniExport'])
                ->whereIn('format', ['csv', 'xlsx']);
            Route::get('surveys/{survey}/results/export/{format}', [ReportController::class, 'surveyResultsExport'])
                ->whereIn('format', ['csv', 'xlsx']);
        });

        // Engagement (phase 10)
        Route::apiResource('announcements', AnnouncementController::class);
        Route::apiResource('events', EventController::class);
        Route::apiResource('job-vacancies', JobVacancyController::class);

        // Career center — job applications & saved jobs (phase 9)
        Route::get('job-applications/my', [JobApplicationController::class, 'my']);
        Route::get('job-applications', [JobApplicationController::class, 'index']);
        Route::patch('job-applications/{jobApplication}/status', [JobApplicationController::class, 'updateStatus']);
        Route::delete('job-applications/{jobApplication}', [JobApplicationController::class, 'destroy']);
        Route::post('job-vacancies/{jobVacancy}/apply', [JobApplicationController::class, 'apply']);
        Route::get('saved-jobs', [SavedJobController::class, 'index']);
        Route::post('job-vacancies/{jobVacancy}/save', [SavedJobController::class, 'store']);
        Route::delete('job-vacancies/{jobVacancy}/save', [SavedJobController::class, 'destroy']);

        // Notifications (phase 10)
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('unread-count', [NotificationController::class, 'unreadCount']);
            Route::post('read-all', [NotificationController::class, 'markAllRead']);
            Route::post('{notification}/read', [NotificationController::class, 'markRead']);
        });
    });
});
