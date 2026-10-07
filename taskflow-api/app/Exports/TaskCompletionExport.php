<?php

namespace App\Exports;

use App\Models\Task;
use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TaskCompletionExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(protected User $viewer, protected ?int $projectId = null) {}

    public function collection()
    {
        // visibleTo() first, so a project_id filter can't be used to read
        // another team's tasks either.
        return Task::query()
            ->visibleTo($this->viewer)
            ->when($this->projectId, fn ($q) => $q->where('project_id', $this->projectId))
            ->with(['assignee:id,name', 'project:id,name'])
            ->get();
    }

    public function headings(): array
    {
        return ['Task', 'Project', 'Assignee', 'Status', 'Priority', 'Due date', 'Completed at'];
    }

    public function map($task): array
    {
        return [
            $task->title,
            $task->project?->name,
            $task->assignee?->name ?? 'Unassigned',
            str_replace('_', ' ', ucfirst($task->status)),
            ucfirst($task->priority),
            $task->due_date?->format('Y-m-d') ?? '—',
            $task->completed_at?->format('Y-m-d H:i') ?? '—',
        ];
    }
}
