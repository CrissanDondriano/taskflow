<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #0F172A; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p.meta { color: #64748B; margin-top: 0; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; background: #F1F5F9; padding: 8px; font-size: 11px; text-transform: uppercase; color: #475569; }
        td { padding: 8px; border-bottom: 1px solid #E2E8F0; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
        .status-active { background: #DBEAFE; color: #1D4ED8; }
        .status-completed { background: #DCFCE7; color: #15803D; }
        .status-archived { background: #F1F5F9; color: #64748B; }
        .priority-critical { background: #FEE2E2; color: #B91C1C; }
        .priority-high { background: #DBEAFE; color: #1D4ED8; }
        .priority-medium { background: #FEF3C7; color: #B45309; }
        .priority-low { background: #CCFBF1; color: #0F766E; }
    </style>
</head>
<body>
    <h1>Project status report</h1>
    <p class="meta">Generated {{ now()->format('F j, Y g:ia') }}</p>

    <table>
        <thead>
            <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th>Tasks</th>
                <th>Completed</th>
                <th>Overdue</th>
                <th>Progress</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($projects as $project)
                @php
                    $progress = $project->tasks_count > 0
                        ? round(($project->completed_tasks_count / $project->tasks_count) * 100, 1)
                        : 0;
                @endphp
                <tr>
                    <td>{{ $project->name }}</td>
                    <td><span class="badge status-{{ $project->status }}">{{ ucfirst($project->status) }}</span></td>
                    <td><span class="badge priority-{{ $project->priority }}">{{ ucfirst($project->priority) }}</span></td>
                    <td>{{ $project->deadline?->format('M j, Y') ?? '—' }}</td>
                    <td>{{ $project->tasks_count }}</td>
                    <td>{{ $project->completed_tasks_count }}</td>
                    <td>{{ $project->overdue_tasks_count }}</td>
                    <td>{{ $progress }}%</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
