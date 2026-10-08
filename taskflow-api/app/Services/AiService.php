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
        // config() returns null when OPENAI_API_KEY isn't set — cast so the
        // empty-key fallback in complete() below can actually run instead of
        // TypeErrors on the typed property.
        $this->apiKey = (string) config('services.openai.key');
        $this->model = config('services.openai.model', 'gpt-4o-mini');
    }

    /**
     * Answer a free-form question from the AI Task Assistant, grounded in the
     * user's current project/task context.
     */
    public function ask(string $question, array $context = []): string
    {
        $system = 'You are the AI Task Assistant inside TaskFlow AI, a task management platform. '
            .'Answer using only the context provided. Be concise and actionable. '
            .'Reference specific task titles and due dates when relevant.';

        $prompt = "Context (JSON):\n".json_encode($context)."\n\nQuestion: ".$this->sanitizeInput($question);

        return $this->complete($system, $prompt);
    }

    /**
     * Turn a project goal + requirements into a structured task breakdown.
     * Returns a decoded array of tasks ready to be inserted.
     */
    public function generateTaskBreakdown(string $goal, string $requirements): array
    {
        $system = 'You are a project planning assistant. Given a project goal and requirements, '
            .'output ONLY valid JSON (no markdown, no prose) matching this shape: '
            .'{"tasks": [{"title": "", "description": "", "priority": "low|medium|high|critical", '
            .'"estimated_days": 0, "category": "", "suggested_role": ""}], "milestones": [{"title": "", "day_offset": 0}]}';

        $prompt = 'Goal: '.$this->sanitizeInput($goal)."\n\nRequirements: ".$this->sanitizeInput($requirements);

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

        $system = 'You are a delivery-risk analyst. Given a list of open tasks, output ONLY valid JSON: '
            .'{"risks": [{"severity": "low|medium|high", "type": "deadline|overload|conflict", "summary": ""}]}';

        $raw = $this->complete($system, json_encode($tasks));

        return $this->safeJsonDecode($raw, ['risks' => []]);
    }

    /**
     * Extract action items and a summary from raw meeting notes / transcript text.
     */
    public function summarizeMeetingNotes(string $notes): array
    {
        $system = 'You convert meeting notes into a summary and action items. Output ONLY valid JSON: '
            .'{"summary": "", "action_items": [{"title": "", "suggested_owner": "", "priority": "low|medium|high|critical"}]}';

        $raw = $this->complete($system, $this->sanitizeInput($notes));

        return $this->safeJsonDecode($raw, ['summary' => '', 'action_items' => []]);
    }

    /**
     * Extract a structured task list from one chunk of a project plan.
     * Uses JSON mode (temperature 0) and returns the decoded payload, or
     * null when the model didn't return usable JSON (the caller retries
     * once). Throws AiUnavailableException when OpenAI can't be reached at
     * all — retrying that is pointless.
     *
     * @param  array<int, string>  $knownRoles  Titles already in use by the
     *                                          team; the model must pick required_role from these when possible.
     * @return array<string, mixed>|null
     */
    public function extractPlanTasks(string $chunk, array $knownRoles): ?array
    {
        $roles = $knownRoles !== []
            ? 'Choose required_role from this list whenever one fits: '.implode(', ', $knownRoles).'. '
            : '';

        $system = 'You turn project plan text into a task list. Output ONLY valid JSON, no markdown, no prose, '
            .'matching this exact shape: {"tasks": [{"title": "", "description": "", '
            .'"required_role": "", "priority": "low|medium|high|urgent", "estimated_days": 0, '
            .'"depends_on": ["exact title of another task in this list"], "suggested_due_offset_days": 0}]}. '
            .$roles
            .'Rules: every task needs a non-empty title; priority defaults to medium when unclear; '
            .'depends_on holds titles from THIS list only (empty array when independent); '
            .'suggested_due_offset_days counts working days from project start (0 when unknown).';

        $raw = $this->completeJson($system, $this->sanitizeInput($chunk));

        if ($raw === null) {
            throw new AiUnavailableException(
                'The AI service is unreachable right now — check OPENAI_API_KEY and try the import again in a minute.'
            );
        }

        $clean = trim((string) preg_replace('/^```json|```$/m', '', $raw));
        $decoded = json_decode($clean, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decoded)) {
            return null;
        }

        return $decoded;
    }

    /**
     * Produce a plain-language weekly productivity summary for a project or team.
     */
    public function weeklySummary(array $stats): string
    {
        $system = 'You write short, encouraging weekly productivity summaries for a project management tool. '
            .'Keep it under 120 words. No markdown headers.';

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

    /**
     * JSON-mode variant of complete(): forces the model into JSON output at
     * temperature 0. Returns the raw string, or null when OpenAI can't be
     * reached at all (missing key or failed request — the caller must fail
     * the operation, not retry it).
     */
    protected function completeJson(string $system, string $user): ?string
    {
        if (empty($this->apiKey)) {
            Log::warning('AiService: OPENAI_API_KEY is not set, extraction aborted.');

            return null;
        }

        $response = Http::withToken($this->apiKey)
            ->timeout(60)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => $this->model,
                'messages' => [
                    ['role' => 'system', 'content' => $system],
                    ['role' => 'user', 'content' => $user],
                ],
                'temperature' => 0,
                'response_format' => ['type' => 'json_object'],
            ]);

        if ($response->failed()) {
            Log::error('AiService: OpenAI JSON request failed', ['body' => $response->body()]);

            return null;
        }

        return $response->json('choices.0.message.content');
    }

    protected function safeJsonDecode(string $raw, array $fallback): array
    {
        $clean = trim(preg_replace('/^```json|```$/m', '', $raw));
        $decoded = json_decode($clean, true);

        return json_last_error() === JSON_ERROR_NONE ? $decoded : $fallback;
    }

    /**
     * Sanitize user input before sending to OpenAI.
     * Strips control characters and enforces a reasonable length limit.
     */
    protected function sanitizeInput(string $input): string
    {
        // Remove control characters (except newlines and tabs)
        $clean = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $input);

        // Limit to 10,000 characters to prevent abuse
        return mb_substr($clean ?? '', 0, 10000);
    }
}
