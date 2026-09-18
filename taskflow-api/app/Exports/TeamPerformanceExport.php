<?php

namespace App\Exports;

use App\Models\User;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TeamPerformanceExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return User::withCount([
            'assignedTasks',
            'assignedTasks as completed_tasks_count' => fn ($q) => $q->where('status', 'completed'),
            'assignedTasks as overdue_tasks_count' => fn ($q) => $q->where('due_date', '<', now())->where('status', '!=', 'completed'),
        ])->get();
    }

    public function headings(): array
    {
        return ['Name', 'Role', 'Assigned tasks', 'Completed', 'Overdue', 'Completion rate %'];
    }

    public function map($user): array
    {
        $rate = $user->assigned_tasks_count > 0
            ? round(($user->completed_tasks_count / $user->assigned_tasks_count) * 100, 1)
            : 0;

        return [
            $user->name,
            ucfirst($user->role),
            $user->assigned_tasks_count,
            $user->completed_tasks_count,
            $user->overdue_tasks_count,
            $rate,
        ];
    }
}
