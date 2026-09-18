<?php

namespace App\Services;

use App\Models\Integration;
use App\Models\Task;
use App\Models\Team;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SlackService
{
    /**
     * Post a message to the team's connected Slack channel via an
     * Incoming Webhook. Fails silently (with a log entry) so a broken
     * integration never blocks the underlying app action.
     */
    public function notify(Team $team, string $text, array $blocks = []): bool
    {
        $integration = $team->relationLoaded('integrations')
            ? $team->integrations->firstWhere('provider', 'slack')
            : Integration::where('team_id', $team->id)->where('provider', 'slack')->where('is_active', true)->first();

        if (! $integration) {
            return false;
        }

        $webhookUrl = $integration->credentials['webhook_url'] ?? null;

        if (! $webhookUrl) {
            Log::warning("SlackService: team {$team->id} has a Slack integration with no webhook_url.");
            return false;
        }

        $payload = ['text' => $text];
        if (! empty($blocks)) {
            $payload['blocks'] = $blocks;
        }

        $response = Http::timeout(10)->post($webhookUrl, $payload);

        if ($response->failed()) {
            Log::error('SlackService: notification failed', ['team_id' => $team->id, 'body' => $response->body()]);
        }

        return $response->successful();
    }

    public function taskAssigned(Task $task): bool
    {
        if (! $task->project->team) {
            return false;
        }

        return $this->notify(
            $task->project->team,
            ":inbox_tray: *{$task->assignee?->name}* was assigned *{$task->title}* in {$task->project->name}" .
                ($task->due_date ? " (due {$task->due_date->format('M j')})" : '')
        );
    }

    public function taskCompleted(Task $task): bool
    {
        if (! $task->project->team) {
            return false;
        }

        return $this->notify(
            $task->project->team,
            ":white_check_mark: *{$task->title}* was completed in {$task->project->name}"
        );
    }

    public function riskAlert(Task $task, string $riskSummary): bool
    {
        if (! $task->project->team) {
            return false;
        }

        return $this->notify(
            $task->project->team,
            ":warning: AI risk alert for *{$task->project->name}*: {$riskSummary}"
        );
    }
}
