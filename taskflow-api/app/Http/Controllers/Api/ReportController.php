<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\AiService;
use App\Support\ReportCache;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(protected AiService $ai) {}

    /**
     * Every query below is scoped to what the requester may see (visible
     * projects/tasks, teammates) and cached per user via ReportCache —
     * reports were previously global and unscoped, leaking other tenants'
     * project and user data to any authenticated caller. Responses use the
     * standard {data} resource envelope.
     */
    public function projectStatus(Request $request)
    {
        $user = $request->user();

        $projects = ReportCache::remember('projectStatus', $user->id, fn () => Project::query()
            ->visibleTo($user)
            ->withCount([
                'tasks',
                'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'completed'),
                'tasks as overdue_tasks_count' => fn ($q) => $q->where('due_date', '<', now())->where('status', '!=', 'completed'),
            ])->get());

        return response()->json(['data' => $projects]);
    }

    public function teamPerformance(Request $request)
    {
        $user = $request->user();

        $users = ReportCache::remember('teamPerformance', $user->id, fn () => User::query()
            ->performanceFor($user)
            ->withCount([
                'assignedTasks',
                'assignedTasks as completed_tasks_count' => fn ($q) => $q->where('status', 'completed'),
            ])->get(['id', 'name', 'role']));

        return response()->json(['data' => $users]);
    }

    public function productivity(Request $request)
    {
        $user = $request->user();

        // The requester's own 7-day completion trend (team-wide numbers live
        // in team-performance above).
        $trend = ReportCache::remember('productivity', $user->id, fn () => Task::query()
            ->selectRaw('DATE(completed_at) as day, COUNT(*) as completed')
            ->where('assignee_id', $user->id)
            ->whereNotNull('completed_at')
            ->where('completed_at', '>=', now()->subDays(7))
            ->groupBy('day')
            ->orderBy('day')
            ->get());

        return response()->json(['data' => $trend]);
    }

    public function weeklySummary(Request $request)
    {
        $user = $request->user();

        $stats = ReportCache::remember('weeklySummary', $user->id, fn () => [
            'tasks_completed_this_week' => Task::query()->visibleTo($user)
                ->where('completed_at', '>=', now()->startOfWeek())->count(),
            'tasks_overdue' => Task::query()->visibleTo($user)
                ->where('due_date', '<', now())->where('status', '!=', 'completed')->count(),
            'active_projects' => Project::query()->visibleTo($user)
                ->where('status', 'active')->count(),
        ]);

        return response()->json(['data' => ['stats' => $stats, 'summary' => $this->ai->weeklySummary($stats)]]);
    }
}
