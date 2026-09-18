<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function __construct(protected AiService $ai) {}

    public function projectStatus(Request $request)
    {
        $projects = Project::withCount([
            'tasks',
            'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'completed'),
            'tasks as overdue_tasks_count' => fn ($q) => $q->where('due_date', '<', now())->where('status', '!=', 'completed'),
        ])->get();

        return response()->json($projects);
    }

    public function teamPerformance(Request $request)
    {
        $data = User::withCount([
            'assignedTasks',
            'assignedTasks as completed_tasks_count' => fn ($q) => $q->where('status', 'completed'),
        ])->get(['id', 'name', 'role']);

        return response()->json($data);
    }

    public function productivity(Request $request)
    {
        $trend = Task::selectRaw('DATE(completed_at) as day, COUNT(*) as completed')
            ->whereNotNull('completed_at')
            ->where('completed_at', '>=', now()->subDays(7))
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        return response()->json($trend);
    }

    public function weeklySummary(Request $request)
    {
        $stats = [
            'tasks_completed_this_week' => Task::where('completed_at', '>=', now()->startOfWeek())->count(),
            'tasks_overdue' => Task::where('due_date', '<', now())->where('status', '!=', 'completed')->count(),
            'active_projects' => Project::where('status', 'active')->count(),
        ];

        return response()->json(['stats' => $stats, 'summary' => $this->ai->weeklySummary($stats)]);
    }
}
