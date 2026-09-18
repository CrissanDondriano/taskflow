<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiInsight;
use App\Models\Project;
use App\Notifications\TaskAtRiskNotification;
use App\Services\AiService;
use App\Services\SlackService;
use Illuminate\Http\Request;

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

        $context = [];

        if (! empty($data['project_id'])) {
            $project = Project::with('tasks:id,project_id,title,status,priority,due_date,assignee_id')->find($data['project_id']);
            $context = $project?->toArray() ?? [];
        } else {
            $context = $request->user()->assignedTasks()
                ->whereNotIn('status', ['completed'])
                ->get(['id', 'title', 'status', 'priority', 'due_date'])
                ->toArray();
        }

        $answer = $this->ai->ask($data['question'], $context);

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
        $breakdown = $this->ai->generateTaskBreakdown($data['goal'], $data['requirements'] ?? '');

        if (! empty($data['create'])) {
            foreach ($breakdown['tasks'] ?? [] as $t) {
                $project->tasks()->create([
                    'title' => $t['title'] ?? 'Untitled task',
                    'description' => $t['description'] ?? null,
                    'priority' => $t['priority'] ?? 'medium',
                    'category' => $t['category'] ?? null,
                    'created_by' => $request->user()->id,
                    'ai_generated' => true,
                ]);
            }
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
        $result = $this->ai->detectRisks($project);

        foreach ($result['risks'] ?? [] as $risk) {
            AiInsight::create([
                'project_id' => $project->id,
                'type' => 'risk',
                'content' => $risk['summary'] ?? '',
                'meta' => $risk,
            ]);

            if (($risk['severity'] ?? null) === 'high' && $project->team) {
                $this->slack->notify($project->team, ":warning: AI risk alert for *{$project->name}*: " . ($risk['summary'] ?? ''));
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
            'project_id' => ['required', 'exists:projects,id'],
            'notes' => ['required', 'string'],
            'create_tasks' => ['sometimes', 'boolean'],
        ]);

        $project = Project::findOrFail($data['project_id']);
        $result = $this->ai->summarizeMeetingNotes($data['notes']);

        AiInsight::create([
            'project_id' => $project->id,
            'type' => 'summary',
            'content' => $result['summary'] ?? '',
            'meta' => $result,
        ]);

        if (! empty($data['create_tasks'])) {
            foreach ($result['action_items'] ?? [] as $item) {
                $project->tasks()->create([
                    'title' => $item['title'] ?? 'Untitled task',
                    'priority' => $item['priority'] ?? 'medium',
                    'created_by' => $request->user()->id,
                    'ai_generated' => true,
                ]);
            }
        }

        return response()->json($result);
    }
}
