<?php

namespace App\Providers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Policies\ProjectPolicy;
use App\Policies\TaskPolicy;
use App\Policies\TeamPolicy;
use App\Support\ReportCache;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Azure\Provider;
use SocialiteProviders\Manager\SocialiteWasCalled;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);
        Gate::policy(Team::class, TeamPolicy::class);

        // Report queries are cached per user (ReportCache) with a 5-minute
        // TTL. Any write to their inputs bumps the cache version so the next
        // read rebuilds instead of serving stale numbers; the orphaned
        // entries age out through their own TTL.
        foreach ([Task::class, Project::class, User::class] as $reportModel) {
            foreach (['created', 'updated', 'deleted'] as $event) {
                $reportModel::{$event}(fn () => ReportCache::invalidate());
            }
        }

        // AI endpoints proxy paid OpenAI usage — keep a tight per-user budget
        // (10/min) on top of the general 60/min authenticated limiter.
        RateLimiter::for('ai', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?? $request->ip());
        });

        // Password resets land on the React SPA's /reset-password page. The
        // default Laravel URL builder would call route('password.reset'),
        // which doesn't exist in this API-only routeset.
        ResetPassword::$createUrlCallback = function (User $notifiable, string $token): string {
            return rtrim(config('app.frontend_url'), '/')
                .'/reset-password?token='.$token.'&email='.urlencode($notifiable->getEmailForPasswordReset());
        };

        Event::listen(function (SocialiteWasCalled $event) {
            $event->extendSocialite('azure', Provider::class);
        });
    }
}
