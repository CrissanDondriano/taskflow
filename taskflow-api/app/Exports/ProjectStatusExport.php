<?php

namespace App\Exports;

use App\Models\Project;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProjectStatusExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return Project::withCount([
            'tasks',
            'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'completed'),
            'tasks as overdue_tasks_count' => fn ($q) => $q->where('due_date', '<', now())->where('status', '!=', 'completed'),
        ])->get();
    }

    public function headings(): array
    {
        return ['Project', 'Status', 'Priority', 'Deadline', 'Total tasks', 'Completed', 'Overdue', 'Progress %'];
    }

    public function map($project): array
    {
        $progress = $project->tasks_count > 0
            ? round(($project->completed_tasks_count / $project->tasks_count) * 100, 1)
            : 0;

        return [
            $project->name,
            ucfirst($project->status),
            ucfirst($project->priority),
            $project->deadline?->format('Y-m-d') ?? '—',
            $project->tasks_count,
            $project->completed_tasks_count,
            $project->overdue_tasks_count,
            $progress,
        ];
    }
}
