<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiService
{
    protected string $apiKey;
    protected string $model;

    public function __construct()
    {
        $this->apiKey = config('services.openai.key');
        $this->model = config('services.openai.model', 'gpt-4o-mini');
    }

    /**
     * Answer a free-form question from the AI Task Assistant, grounded in the
     * user's current project/task context.
     */
    public function ask(string $question, array $context = []): string
    {
        $system = "You are the AI Task Assistant inside TaskFlow AI, a task management platform. "
            . "Answer using only the context provided. Be concise and actionable. "
            . "Reference specific task titles and due dates when relevant.";

        $prompt = "Context (JSON):\n" . json_encode($context) . "\n\nQuestion: {$question}";

        return $this->complete($system, $prompt);
    }

    /**
     * Turn a project goal + requirements into a structured task breakdown.
     * Returns a decoded array of tasks ready to be inserted.
     */
    public function generateTaskBreakdown(string $goal, string $requirements): array
    {
        $system = "You are a project planning assistant. Given a project goal and requirements, "
            . "output ONLY valid JSON (no markdown, no prose) matching this shape: "
            . '{"tasks": [{"title": "", "description": "", "priority": "low|medium|high|critical", '
            . '"estimated_days": 0, "category": "", "suggested_role": ""}], "milestones": [{"title": "", "day_offset": 0}]}';

        $prompt = "Goal: {$goal}\n\nRequirements: {$requirements}";

        $raw = $this->complete($system, $prompt);

        return $this->safeJsonDecode($raw, ['tasks' => [], 'milestones' => []]);
    }

    /**
     * Look across a project's open tasks and flag deadline risk, overloaded
     * assignees, and resource conflicts.
     */
    public function detectRisks(Project $project): array
    {
        $tasks = $project->tasks()
            ->whereNotIn('status', ['completed'])
            ->with('assignee:id,name')
            ->get(['id', 'title', 'status', 'priority', 'due_date', 'assignee_id'])
            ->map(fn ($t) => [
                'title' => $t->title,
                'status' => $t->status,
                'priority' => $t->priority,
                'due_date' => $t->due_date?->toDateString(),
                'assignee' => $t->assignee?->name,
                'is_overdue' => $t->isOverdue(),
            ]);

        $system = "You are a delivery-risk analyst. Given a list of open tasks, output ONLY valid JSON: "
            . '{"risks": [{"severity": "low|medium|high", "type": "deadline|overload|conflict", "summary": ""}]}';

        $raw = $this->complete($system, json_encode($tasks));

        return $this->safeJsonDecode($raw, ['risks' => []]);
    }

    /**
     * Extract action items and a summary from raw meeting notes / transcript text.
     */
    public function summarizeMeetingNotes(string $notes): array
    {
        $system = "You convert meeting notes into a summary and action items. Output ONLY valid JSON: "
            . '{"summary": "", "action_items": [{"title": "", "suggested_owner": "", "priority": "low|medium|high|critical"}]}';

        $raw = $this->complete($system, $notes);

        return $this->safeJsonDecode($raw, ['summary' => '', 'action_items' => []]);
    }

    /**
     * Produce a plain-language weekly productivity summary for a project or team.
     */
    public function weeklySummary(array $stats): string
    {
        $system = "You write short, encouraging weekly productivity summaries for a project management tool. "
            . "Keep it under 120 words. No markdown headers.";

        return $this->complete($system, json_encode($stats));
    }

    /**
     * Low-level call to the OpenAI Chat Completions API.
     */
    protected function complete(string $system, string $user): string
    {
        if (empty($this->apiKey)) {
            Log::warning('AiService: OPENAI_API_KEY is not set, returning stub response.');
            return '{"error": "AI is not configured. Set OPENAI_API_KEY in .env."}';
        }

        $response = Http::withToken($this->apiKey)
            ->timeout(30)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $this->model,
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $user],
                ],
                'temperature' => 0.4,
            ]);

        if ($response->failed()) {
            Log::error('AiService: OpenAI request failed', ['body' => $response->body()]);
            return '{"error": "AI request failed."}';
        }

        return $response->json('choices.0.message.content', '');
    }

    protected function safeJsonDecode(string $raw, array $fallback): array
    {
        $clean = trim(preg_replace('/^```json|```$/m', '', $raw));
        $decoded = json_decode($clean, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $fallback;
    }
}
