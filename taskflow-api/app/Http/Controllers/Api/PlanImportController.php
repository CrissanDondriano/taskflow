<?php

namespace App\Http\Controllers\Api;

use App\Billing\EnforcePlanLimits;
use App\Http\Controllers\Controller;
use App\Jobs\ProcessPlanImport;
use App\Models\PlanImport;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PlanImportController extends Controller
{
    /**
     * POST /api/v1/teams/{team}/plan-imports
     * Upload a project plan (PDF, DOCX, TXT, MD ≤ 10MB, stored privately)
     * and queue AI extraction. Any team member may import.
     */
    public function store(Request $request, Team $team)
    {
        $this->ensureMember($request->user()->id, $team, $request->user()->isAdmin());

        // Monthly import quota is consumed by the attempt itself.
        EnforcePlanLimits::for($team)->check('plan_imports');

        $data = $request->validate([
            'file' => ['required', 'file', 'max:10240', 'extensions:pdf,docx,txt,md'],
            'project_id' => ['nullable', 'exists:projects,id'],
        ]);

        if (! empty($data['project_id'])) {
            $project = Project::find($data['project_id']);
            if (! $project || ! $project->isVisibleTo($request->user())) {
                return response()->json(['message' => 'That project is not available.'], 403);
            }
        }

        $file = $request->file('file');

        $import = PlanImport::create([
            'team_id' => $team->id,
            'project_id' => $data['project_id'] ?? null,
            'user_id' => $request->user()->id,
            'file_path' => $file->store('plan-imports', 'local'),
            'original_name' => $file->getClientOriginalName(),
            'status' => PlanImport::STATUS_PENDING,
        ]);

        EnforcePlanLimits::for($team)->record('plan_imports');

        ProcessPlanImport::dispatch($import->id);

        return response()->json(['data' => $this->shape($import->fresh())], 201);
    }

    /**
     * GET /api/v1/plan-imports/{planImport}
     * Pollable status + extracted task rows for the review screen.
     */
    public function show(Request $request, PlanImport $planImport)
    {
        $this->ensureVisible($request, $planImport);

        return response()->json(['data' => $this->shape($planImport)]);
    }

    /**
     * POST /api/v1/plan-imports/{planImport}/approve
     * Create real tasks from the reviewed list inside one transaction.
     * Accepts the review screen's rows (edited titles, priorities, due
     * dates, assignees) plus the target project. Only a ready import can
     * be approved, exactly once.
     */
    public function approve(Request $request, PlanImport $planImport)
    {
        $this->ensureVisible($request, $planImport);

        $team = $planImport->team;
        if (! $request->user()->isAdmin() && ! $this->isMember($request->user()->id, $team)) {
            return response()->json(['message' => 'Only team members can approve this import.'], 403);
        }

        if ($planImport->status === PlanImport::STATUS_APPROVED) {
            return response()->json(['message' => 'This import was already approved — its tasks exist.'], 422);
        }
        if ($planImport->status !== PlanImport::STATUS_READY) {
            $message = $planImport->status === PlanImport::STATUS_FAILED
                ? 'This import failed to extract tasks, so there is nothing to approve.'
                : 'This import is still being read — approve it once the task list is ready.';
            $code = $planImport->status === PlanImport::STATUS_FAILED ? 422 : 409;

            return response()->json(['message' => $message], $code);
        }

        $data = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'tasks' => ['required', 'array', 'min:1', 'max:200'],
            'tasks.*.title' => ['required', 'string', 'max:255'],
            'tasks.*.description' => ['nullable', 'string'],
            'tasks.*.priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'urgent', 'critical'])],
            'tasks.*.required_role' => ['nullable', 'string', 'max:100'],
            'tasks.*.assignee_id' => ['nullable', 'exists:users,id'],
            'tasks.*.due_date' => ['nullable', 'date'],
            'tasks.*.suggested_due_offset_days' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'tasks.*.depends_on' => ['sometimes', 'array'],
            'tasks.*.depends_on.*' => ['string'],
        ]);

        $project = Project::find($data['project_id']);
        if (! $project->isVisibleTo($request->user())) {
            return response()->json(['message' => 'That project is not available.'], 403);
        }

        // Assignees must belong to the import's team — no handing work to strangers.
        $memberIds = $team->members()->pluck('users.id')->all();
        foreach ($data['tasks'] as $row) {
            if (! empty($row['assignee_id']) && ! in_array($row['assignee_id'], $memberIds, false)) {
                return response()->json(['message' => 'Every assignee must be a member of this team.'], 422);
            }
        }

        $created = DB::transaction(function () use ($data, $project, $request, $planImport) {
            $position = (int) (Task::where('project_id', $project->id)->max('position') ?? -1) + 1;
            $made = [];

            foreach ($data['tasks'] as $row) {
                $unmatched = array_values(array_filter(array_map(
                    fn ($d) => is_string($d) ? trim($d) : '',
                    $row['depends_on'] ?? []
                )));

                $description = trim((string) ($row['description'] ?? ''));
                if ($unmatched !== []) {
                    $note = 'Depends on: '.implode(', ', $unmatched);
                    $description = $description === '' ? $note : $description."\n\n".$note;
                }

                $dueDate = $row['due_date'] ?? null;
                if ($dueDate === null && isset($row['suggested_due_offset_days'])) {
                    $dueDate = today()->addDays((int) $row['suggested_due_offset_days'])->toDateString();
                }

                $made[] = [
                    'task' => Task::create([
                        'project_id' => $project->id,
                        'created_by' => $request->user()->id,
                        'assignee_id' => $row['assignee_id'] ?? null,
                        'title' => trim($row['title']),
                        'description' => $description === '' ? null : $description,
                        'status' => 'backlog',
                        'priority' => $this->mapPriority($row['priority'] ?? 'medium'),
                        'category' => isset($row['required_role']) && trim((string) $row['required_role']) !== ''
                            ? mb_substr(trim((string) $row['required_role']), 0, 100)
                            : null,
                        'due_date' => $dueDate,
                        'position' => $position++,
                        'ai_generated' => true,
                    ]),
                    'depends_on' => $unmatched,
                ];
            }

            // Second pass: link dependencies whose titles match siblings in
            // this same batch (first match wins — parent_task_id is single).
            $byTitle = [];
            foreach ($made as $entry) {
                $byTitle[mb_strtolower(trim($entry['task']->title))] = $entry['task']->id;
            }
            foreach ($made as $entry) {
                foreach ($entry['depends_on'] as $dep) {
                    $match = $byTitle[mb_strtolower(trim($dep))] ?? null;
                    if ($match && $match !== $entry['task']->id) {
                        $entry['task']->update(['parent_task_id' => $match]);
                        break;
                    }
                }
            }

            $planImport->update(['status' => PlanImport::STATUS_APPROVED, 'project_id' => $project->id]);

            return array_map(fn ($e) => $e['task'], $made);
        });

        return response()->json([
            'data' => [
                'import_id' => $planImport->id,
                'project_id' => $project->id,
                'tasks_created' => count($created),
                'task_ids' => array_map(fn ($t) => $t->id, $created),
            ],
        ], 201);
    }

    protected function mapPriority(string $priority): string
    {
        $priority = mb_strtolower(trim($priority));

        return $priority === 'urgent' ? 'critical' : $priority;
    }

    protected function isMember(int $userId, Team $team): bool
    {
        return $team->members()->where('users.id', $userId)->exists();
    }

    /**
     * Upload gate: team members and platform admins. The team itself is
     * route-bound (unknown teams 404 before this runs).
     */
    protected function ensureMember(int $userId, Team $team, bool $isAdmin): void
    {
        if (! $isAdmin && ! $this->isMember($userId, $team)) {
            abort(403, 'Only team members can import plans.');
        }
    }

    /**
     * Read gate: strangers get 404 (existence stays hidden), matching the
     * rest of the team-scoped API.
     */
    protected function ensureVisible(Request $request, PlanImport $planImport): void
    {
        $query = PlanImport::query()->visibleTo($request->user());
        if (! $query->where('plan_imports.id', $planImport->id)->exists()) {
            abort(404, 'Resource not found.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function shape(PlanImport $import): array
    {
        return [
            'id' => $import->id,
            'team_id' => $import->team_id,
            'project_id' => $import->project_id,
            'original_name' => $import->original_name,
            'status' => $import->status,
            'tasks' => $import->tasks(),
            'error_message' => $import->error_message,
            'created_at' => $import->created_at?->toISOString(),
            'updated_at' => $import->updated_at?->toISOString(),
        ];
    }
}
