<?php

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Per-user report cache with coarse global invalidation.
 *
 * Report queries depend on the requesting user's visibility (teammates,
 * managed teams), so keys are scoped by user id — one account's report is
 * never served to another. Instead of forgetting individual keys, writes
 * bump a version counter: the bump orphans every cached report at once and
 * the old entries age out through their normal TTL, so no write path needs
 * to know which users exist.
 */
class ReportCache
{
    /**
     * @param  Closure(): mixed  $callback
     */
    public static function remember(string $report, int $userId, Closure $callback): mixed
    {
        $version = Cache::get('reports.version', 1);

        return Cache::remember(
            "reports.v{$version}.{$report}.user.{$userId}",
            now()->addMinutes(5),
            $callback
        );
    }

    public static function invalidate(): void
    {
        Cache::forever('reports.version', Cache::get('reports.version', 1) + 1);
    }
}
