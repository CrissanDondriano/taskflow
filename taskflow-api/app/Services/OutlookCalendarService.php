<?php

namespace App\Services;

use App\Models\Integration;
use App\Models\Task;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OutlookCalendarService
{
    /**
     * Push a task's deadline to the team's connected Outlook Calendar via
     * Microsoft Graph. Mirrors GoogleCalendarService's shape so callers
     * (TaskController) don't need to care which provider is connected.
     */
    public function syncTaskDeadline(Task $task): bool
    {
        if (! $task->due_date || ! $task->project->team) {
            return false;
        }

        $integration = Integration::where('team_id', $task->project->team->id)
            ->where('provider', 'outlook')
            ->where('is_active', true)
            ->first();

        if (! $integration) {
            return false;
        }

        $this->ensureFreshToken($integration);
        $token = $integration->fresh()->credentials['access_token'];

        $response = Http::withToken($token)
            ->post('https://graph.microsoft.com/v1.0/me/events', [
                'subject' => "[TaskFlow] {$task->title}",
                'body' => ['contentType' => 'text', 'content' => $task->description ?? ''],
                'start' => ['dateTime' => $task->due_date->toDateString() . 'T09:00:00', 'timeZone' => 'UTC'],
                'end' => ['dateTime' => $task->due_date->toDateString() . 'T09:30:00', 'timeZone' => 'UTC'],
                'isAllDay' => true,
            ]);

        if ($response->failed()) {
            Log::error('OutlookCalendarService: event creation failed', ['body' => $response->body()]);
            return false;
        }

        return true;
    }

    protected function ensureFreshToken(Integration $integration): void
    {
        $creds = $integration->credentials;

        if (now()->lt($creds['expires_at'] ?? now()->subMinute())) {
            return;
        }

        $response = Http::asForm()->post('https://login.microsoftonline.com/common/oauth2/v2.0/token', [
            'client_id' => config('services.microsoft.client_id'),
            'client_secret' => config('services.microsoft.client_secret'),
            'refresh_token' => $creds['refresh_token'],
            'grant_type' => 'refresh_token',
            'scope' => 'offline_access Calendars.ReadWrite',
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $integration->update([
                'credentials' => [
                    ...$creds,
                    'access_token' => $data['access_token'],
                    'refresh_token' => $data['refresh_token'] ?? $creds['refresh_token'],
                    'expires_at' => now()->addSeconds($data['expires_in'])->toIso8601String(),
                ],
            ]);
        } else {
            Log::error('OutlookCalendarService: token refresh failed', ['body' => $response->body()]);
        }
    }
}
