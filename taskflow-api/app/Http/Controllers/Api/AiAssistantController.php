<?php

namespace App\Http\Controllers\Api;

use App\Billing\EnforcePlanLimits;
use App\Http\Controllers\Controller;
use App\Models\AiInsight;
use App\Models\Project;
use App\Notifications\TaskAtRiskNotification;
use App\Services\AiService;
use App\Services\SlackService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AiAssistantController extends Controller
{
    public function __construct(protected AiService $ai, protected SlackService $slack) {}

    /**
     * POST /api/ai/ask
     * "What should I work on today?", "Which tasks are at risk?", etc.
     */
    public function ask(Request $request)
    {
        $data = $request->validate([
            'question' => ['required', 'string'],
            'project_id' => ['nullable', 'exists:projects,id'],
        ]);

        // AI message quota is per workspace (first team), counted only when
        // the model actually answers — unconfigured-AI fallbacks are free.
        $team = $request->user()->ownedTeams()->first() ?? $request->user()->teams()->first();
        if ($team) {
            EnforcePlanLimits::for($team)->check('ai_messages');
        }

        $context = [];

        if (! empty($data['project_id'])) {
            $project = Project::with('tasks:id,project_id,title,status,priority,due_date,assignee_id')->find($data['project_id']);
            // The AI must not read projects outside the requester's teams.
            $this->authorize('view', $project);
            $context = $project?->toArray() ?? [];
        } else {
            $context = $request->user()->assignedTasks()
                ->whereNotIn('status', ['completed'])
                ->get(['id', 'title', 'status', 'priority', 'due_date'])
                ->toArray();
        }

        $answer = $this->ai->ask($data['question'], $context);

        if ($team && ! str_starts_with(ltrim($answer), '{"error"')) {
            EnforcePlanLimits::for($team)->record('ai_messages');
        }

        return response()->json(['answer' => $answer]);
    }

    /**
     * POST /api/ai/generate-tasks
     * User enters a project goal + requirements; AI returns a task breakdown.
     * Set create=true to persist the generated tasks immediately.
     */
    public function generateTasks(Request $request)
    {
        $data = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'goal' => ['required', 'string'],
            'requirements' => ['nullable', 'string'],
            'create' => ['sometimes', 'boolean'],
        ]);

        $project = Project::findOrFail($data['project_id']);
        $this->authorize('view', $project);

        $breakdown = $this->ai->generateTaskBreakdown($data['goal'], $data['requirements'] ?? '');

        if (! empty($data['create'])) {
            $this->persistGeneratedTasks($project, $breakdown['tasks'] ?? [], $request->user()->id);
        }

        return response()->json($breakdown);
    }

    /**
     * GET /api/ai/risks?project_id=
     */
    public function risks(Request $request)
    {
        $data = $request->validate(['project_id' => ['required', 'exists:projects,id']]);

        $project = Project::with('team')->findOrFail($data['project_id']);
        $this->authorize('view', $project);

        $result = $this->ai->detectRisks($project);

        foreach ($result['risks'] ?? [] as $risk) {
            // Dedupe: refreshing the endpoint must not re-insert the same
            // insight or re-notify the team about a risk we already reported.
            $insight = AiInsight::updateOrCreate(
                [
                    'project_id' => $project->id,
                    'type' => 'risk',
                    'content' => $risk['summary'] ?? '',
                ],
                ['meta' => $risk]
            );

            if ($insight->wasRecentlyCreated && ($risk['severity'] ?? null) === 'high' && $project->team) {
                $this->slack->notify($project->team, ":warning: AI risk alert for *{$project->name}*: ".($risk['summary'] ?? ''));
                $project->creator->notify(new TaskAtRiskNotification($project, $risk['summary'] ?? '', $risk['severity']));
            }
        }

        return response()->json($result);
    }

    /**
     * POST /api/ai/meeting-notes
     * Upload or paste meeting notes; AI extracts a summary and action items.
     */
    public function meetingNotes(Request $request)
    {
        $data = $request->validate([
            // Optional: the frontend converter works outside any project
            // context; ai_insights.project_id is nullable.
            'project_id' => ['nullable', 'exists:projects,id'],
            'notes' => ['required', 'string'],
            'create_tasks' => ['sometimes', 'boolean'],
        ]);

        if (! empty($data['create_tasks']) && empty($data['project_id'])) {
            return response()->json(['message' => 'project_id is required when create_tasks is set.'], 422);
        }

        $project = isset($data['project_id']) ? Project::findOrFail($data['project_id']) : null;

        if ($project) {
            $this->authorize('view', $project);
        }

        $result = $this->ai->summarizeMeetingNotes($data['notes']);

        // Only persist real results — a failed/unconfigured AI call comes
        // back as {error} and shouldn't create an empty insight row.
        if (! empty($result['summary']) || ! empty($result['action_items'])) {
            AiInsight::create([
                'project_id' => $project?->id,
                'type' => 'summary',
                'content' => $result['summary'] ?? '',
                'meta' => $result,
            ]);
        }

        if (! empty($data['create_tasks'])) {
            $this->persistGeneratedTasks($project, $result['action_items'] ?? [], $request->user()->id);
        }

        return response()->json($result);
    }

    /**
     * Persist AI-produced task items inside one transaction, normalizing the
     * untrusted model output first: titles/categories are length-capped and
     * priority must be one of the enum values, so a bad model response can't
     * abort a half-written batch with a SQL error.
     */
    private function persistGeneratedTasks(Project $project, array $items, int $userId): void
    {
        DB::transaction(function () use ($project, $items, $userId) {
            foreach ($items as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $title = trim((string) ($item['title'] ?? ''));

                $project->tasks()->create([
                    'title' => Str::limit($title !== '' ? $title : 'Untitled task', 255, ''),
                    'description' => isset($item['description']) && $item['description'] !== null
                        ? (string) $item['description']
                        : null,
                    'priority' => in_array($item['priority'] ?? null, ['low', 'medium', 'high', 'critical'], true)
                        ? $item['priority']
                        : 'medium',
                    'category' => isset($item['category']) && $item['category'] !== null
                        ? Str::limit((string) $item['category'], 100, '')
                        : null,
                    'created_by' => $userId,
                    'ai_generated' => true,
                ]);
            }
        });
    }
}
