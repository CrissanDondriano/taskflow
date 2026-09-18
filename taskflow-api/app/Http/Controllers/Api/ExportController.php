<?php

namespace App\Http\Controllers\Api;

use App\Exports\ProjectStatusExport;
use App\Exports\TaskCompletionExport;
use App\Exports\TeamPerformanceExport;
use App\Http\Controllers\Controller;
use App\Models\Project;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ExportController extends Controller
{
    /**
     * GET /api/reports/project-status/export?format=pdf|xlsx|csv
     */
    public function projectStatus(Request $request)
    {
        $format = $request->query('format', 'pdf');

        $projects = Project::withCount([
            'tasks',
            'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'completed'),
            'tasks as overdue_tasks_count' => fn ($q) => $q->where('due_date', '<', now())->where('status', '!=', 'completed'),
        ])->get();

        return match ($format) {
            'xlsx' => Excel::download(new ProjectStatusExport, 'project-status.xlsx'),
            'csv' => Excel::download(new ProjectStatusExport, 'project-status.csv', \Maatwebsite\Excel\Excel::CSV),
            default => Pdf::loadView('reports.project-status', compact('projects'))
                ->download('project-status.pdf'),
        };
    }

    /**
     * GET /api/reports/team-performance/export?format=xlsx|csv
     */
    public function teamPerformance(Request $request)
    {
        $format = $request->query('format', 'xlsx');

        return match ($format) {
            'csv' => Excel::download(new TeamPerformanceExport, 'team-performance.csv', \Maatwebsite\Excel\Excel::CSV),
            default => Excel::download(new TeamPerformanceExport, 'team-performance.xlsx'),
        };
    }

    /**
     * GET /api/reports/task-completion/export?project_id=&format=xlsx|csv
     */
    public function taskCompletion(Request $request)
    {
        $format = $request->query('format', 'xlsx');
        $export = new TaskCompletionExport($request->query('project_id'));

        return match ($format) {
            'csv' => Excel::download($export, 'task-completion.csv', \Maatwebsite\Excel\Excel::CSV),
            default => Excel::download($export, 'task-completion.xlsx'),
        };
    }
}
