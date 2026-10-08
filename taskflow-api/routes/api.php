<?php

use App\Billing\BillingController;
use App\Billing\StripeWebhookController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AiAssistantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CalendarIntegrationController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\IntegrationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PlanImportController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\TeamMessageController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->name('login')->middleware('throttle:5,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

// Stripe webhook — public (signature-verified), never behind auth.
Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handle']);

// OAuth callbacks — hit directly by Google/Microsoft's redirect, so no
// Sanctum bearer token is present. Team identity travels in the signed
// 'state' param instead (see CalendarIntegrationController).
Route::get('/integrations/google-calendar/callback', [CalendarIntegrationController::class, 'handleGoogleCallback']);
Route::get('/integrations/outlook/callback', [CalendarIntegrationController::class, 'handleOutlookCallback']);

// Authenticated — 60 req/min per user, plus a tighter dedicated limiter on
// /ai/* since every call there can spend paid OpenAI tokens.
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'updateProfile']);
    Route::delete('/me', [AuthController::class, 'destroy']); // account deletion (password-confirmed)

    Route::apiResource('teams', TeamController::class)->only(['index', 'store']);
    Route::post('/teams/{team}/members', [TeamController::class, 'addMember']);
    Route::patch('/teams/{team}/members/{userId}', [TeamController::class, 'updateMemberTitle']);
    Route::delete('/teams/{team}/members/{userId}', [TeamController::class, 'removeMember']);

    // Team chat: reads are cheap, sends are throttled against spam.
    Route::get('/teams/{team}/messages', [TeamMessageController::class, 'index']);
    Route::post('/teams/{team}/messages', [TeamMessageController::class, 'store'])->middleware('throttle:30,1');
    Route::delete('/teams/{team}/messages/{message}', [TeamMessageController::class, 'destroy']);

    // AI plan imports: uploads are heavy, so they get their own tight limiter.
    Route::post('/teams/{team}/plan-imports', [PlanImportController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/plan-imports/{planImport}', [PlanImportController::class, 'show']);
    Route::post('/plan-imports/{planImport}/approve', [PlanImportController::class, 'approve']);

    // Billing (Stripe test mode; disabled entirely when BILLING_ENABLED=false).
    Route::get('/billing', [BillingController::class, 'show']);
    Route::post('/billing/checkout', [BillingController::class, 'checkout'])->middleware('throttle:10,1');
    Route::post('/billing/portal', [BillingController::class, 'portal'])->middleware('throttle:10,1');
    Route::post('/billing/cancel', [BillingController::class, 'cancel']);
    Route::get('/billing/invoices', [BillingController::class, 'invoices']);

    Route::apiResource('projects', ProjectController::class);

    Route::apiResource('tasks', TaskController::class);
    Route::patch('/tasks/{task}/move', [TaskController::class, 'move']); // kanban drag-and-drop
    Route::get('/tasks/{task}/comments', [TaskController::class, 'comments']);
    Route::post('/tasks/{task}/comments', [TaskController::class, 'addComment']);
    Route::delete('/tasks/{task}/comments/{comment}', [TaskController::class, 'deleteComment']);
    Route::post('/tasks/{task}/attachments', [TaskController::class, 'addAttachment']);

    // AI features
    Route::prefix('ai')->middleware('throttle:ai')->group(function () {
        Route::post('/ask', [AiAssistantController::class, 'ask']);
        Route::post('/generate-tasks', [AiAssistantController::class, 'generateTasks']);
        Route::get('/risks', [AiAssistantController::class, 'risks']);
        Route::post('/meeting-notes', [AiAssistantController::class, 'meetingNotes']);
    });

    // Reports
    Route::get('/reports/project-status', [ReportController::class, 'projectStatus']);
    Route::get('/reports/team-performance', [ReportController::class, 'teamPerformance']);
    Route::get('/reports/productivity', [ReportController::class, 'productivity']);
    Route::get('/reports/weekly-summary', [ReportController::class, 'weeklySummary']);

    // Report exports — PDF for project status, Excel/CSV for the rest
    Route::get('/reports/project-status/export', [ExportController::class, 'projectStatus']);
    Route::get('/reports/team-performance/export', [ExportController::class, 'teamPerformance']);
    Route::get('/reports/task-completion/export', [ExportController::class, 'taskCompletion']);

    // Third-party integrations (Slack live; others follow the same Integration model)
    Route::get('/teams/{team}/integrations', [IntegrationController::class, 'index']);
    Route::post('/teams/{team}/integrations/slack', [IntegrationController::class, 'connectSlack']);
    Route::delete('/teams/{team}/integrations/{provider}', [IntegrationController::class, 'disconnect']);

    // Calendar OAuth — redirect is authenticated (we need to know which team/user
    // initiated it); the matching callback above is public.
    Route::get('/teams/{team}/integrations/google-calendar/redirect', [CalendarIntegrationController::class, 'redirectToGoogle']);
    Route::get('/teams/{team}/integrations/outlook/redirect', [CalendarIntegrationController::class, 'redirectToOutlook']);

    // Real-time / in-app notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
});

// Admin only — EnsureAdmin throws AuthorizationException (403) for non-admins
Route::prefix('admin')->middleware(['auth:sanctum', 'admin', 'throttle:30,1'])->group(function () {
    Route::get('/stats', [AdminController::class, 'stats']);
    Route::get('/users', [AdminController::class, 'users']);
    Route::patch('/users/{user}/role', [AdminController::class, 'updateRole']);
    Route::get('/audit-logs', [AdminController::class, 'auditLogs']);
});
