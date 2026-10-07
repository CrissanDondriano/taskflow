<?php

namespace App\Http\Controllers\Api;

use App\Exports\ProjectStatusExport;
use App\Exports\TaskCompletionExport;
use App\Exports\TeamPerformanceExport;
use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ExportController extends Controller
{
    /**
     * GET /api/reports/project-status/export?format=pdf|xlsx|csv
     *
     * Exports run the same visibility-scoped queries as the JSON reports:
     * a plain member's file never contains another team's projects.
     */
    public function projectStatus(Request $request)
    {
        $format = $request->query('format', 'pdf');

        $projects = (new ProjectStatusExport($request->user()))->collection();

        return match ($format) {
            'xlsx' => Excel::download(new ProjectStatusExport($request->user()), 'project-status.xlsx'),
            'csv' => Excel::download(new ProjectStatusExport($request->user()), 'project-status.csv', \Maatwebsite\Excel\Excel::CSV),
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
            'csv' => Excel::download(new TeamPerformanceExport($request->user()), 'team-performance.csv', \Maatwebsite\Excel\Excel::CSV),
            default => Excel::download(new TeamPerformanceExport($request->user()), 'team-performance.xlsx'),
        };
    }

    /**
     * GET /api/reports/task-completion/export?project_id=&format=xlsx|csv
     */
    public function taskCompletion(Request $request)
    {
        $format = $request->query('format', 'xlsx');
        $export = new TaskCompletionExport($request->user(), $request->query('project_id'));

        return match ($format) {
            'csv' => Excel::download($export, 'task-completion.csv', \Maatwebsite\Excel\Excel::CSV),
            default => Excel::download($export, 'task-completion.xlsx'),
        };
    }
}
