<?php

namespace App\Services;

use App\Models\Task;
use App\Models\Team;

/**
 * Matches extracted plan tasks to team members by job title.
 * Comparison is case-insensitive; common variants ("UI/UX", "dev",
 * "accounting"…) canonicalize through SYNONYMS first. When several members
 * match, the one with the fewest open (non-completed) tasks wins, with the
 * lowest user id breaking ties so runs are deterministic. No match leaves
 * the row unassigned with needs_assignee=true for the review screen.
 */
class TaskAssignmentService
{
    /**
     * Role variants users actually write, mapped to the canonical title.
     * Keys are lowercase; keep them lowercase.
     *
     * @var array<string, string>
     */
    public const SYNONYMS = [
        'accounting' => 'Accountant',
        'finance' => 'Accountant',
        'bookkeeper' => 'Accountant',
        'bookkeeping' => 'Accountant',
        'ui/ux' => 'Designer',
        'ui' => 'Designer',
        'ux' => 'Designer',
        'ux/ui' => 'Designer',
        'product designer' => 'Designer',
        'dev' => 'Developer',
        'developer' => 'Developer',
        'engineer' => 'Developer',
        'engineering' => 'Developer',
        'programmer' => 'Developer',
        'software' => 'Developer',
        'backend' => 'Developer',
        'frontend' => 'Developer',
        'full-stack' => 'Developer',
        'fullstack' => 'Developer',
        'qa' => 'QA',
        'tester' => 'QA',
        'testing' => 'QA',
        'quality' => 'QA',
        'quality assurance' => 'QA',
        'pm' => 'Project Manager',
        'project management' => 'Project Manager',
        'project manager' => 'Project Manager',
        'marketing' => 'Marketing',
        'growth' => 'Marketing',
        'seo' => 'Marketing',
        'content' => 'Marketing',
        'support' => 'Support',
        'helpdesk' => 'Support',
        'help desk' => 'Support',
        'customer support' => 'Support',
        'customer success' => 'Support',
        'cs' => 'Support',
    ];

    public static function canonicalize(?string $role): ?string
    {
        $role = trim((string) $role);
        if ($role === '') {
            return null;
        }

        $lower = mb_strtolower($role);

        return self::SYNONYMS[$lower] ?? $role;
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks  Extracted rows; each
     *                                                   may carry required_role. Rows are returned with assignee_id (or
     *                                                   null), assignee_name (or null) and needs_assignee added.
     * @return array<int, array<string, mixed>>
     */
    public function assign(array $tasks, Team $team): array
    {
        $members = $team->members()->get(['users.id', 'users.name', 'users.job_title']);

        if ($members->isEmpty()) {
            return array_map(fn ($t) => $this->unassigned($t), $tasks);
        }

        $openCounts = Task::query()
            ->whereIn('assignee_id', $members->pluck('id'))
            ->where('status', '!=', 'completed')
            ->selectRaw('assignee_id, COUNT(*) as open_count')
            ->groupBy('assignee_id')
            ->pluck('open_count', 'assignee_id');

        return array_map(function ($task) use ($members, $openCounts) {
            $wanted = self::canonicalize($task['required_role'] ?? null);
            if ($wanted === null) {
                return $this->unassigned($task);
            }

            $candidates = $members->filter(
                fn ($m) => $m->job_title !== null && mb_strtolower(trim($m->job_title)) === mb_strtolower($wanted)
            );

            if ($candidates->isEmpty()) {
                return $this->unassigned($task);
            }

            $best = $candidates
                ->sortBy([fn ($m) => (int) ($openCounts[$m->id] ?? 0), fn ($m) => $m->id])
                ->first();

            $task['assignee_id'] = $best->id;
            $task['assignee_name'] = $best->name;
            $task['needs_assignee'] = false;

            return $task;
        }, $tasks);
    }

    /**
     * @param  array<string, mixed>  $task
     * @return array<string, mixed>
     */
    protected function unassigned(array $task): array
    {
        $task['assignee_id'] = null;
        $task['assignee_name'] = null;
        $task['needs_assignee'] = true;

        return $task;
    }
}
