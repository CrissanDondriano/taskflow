<?php

namespace App\Services;

use App\Models\Integration;
use App\Models\Task;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    /**
     * Push a task's deadline to the team's connected Google Calendar as an
     * all-day event. Refreshes the access token first if it's expired.
     */
    public function syncTaskDeadline(Task $task): bool
    {
        if (! $task->due_date || ! $task->project->team) {
            return false;
        }

        $integration = Integration::where('team_id', $task->project->team->id)
            ->where('provider', 'google_calendar')
            ->where('is_active', true)
            ->first();

        if (! $integration) {
            return false;
        }

        $this->ensureFreshToken($integration);
        $token = $integration->fresh()->credentials['access_token'];

        $response = Http::withToken($token)
            ->post('https://www.googleapis.com/calendar/v3/calendars/primary/events', [
                'summary' => "[TaskFlow] {$task->title}",
                'description' => $task->description ?? "Task in project {$task->project->name}",
                'start' => ['date' => $task->due_date->toDateString()],
                'end' => ['date' => $task->due_date->toDateString()],
            ]);

        if ($response->failed()) {
            Log::error('GoogleCalendarService: event creation failed', ['body' => $response->body()]);
            return false;
        }

        return true;
    }

    protected function ensureFreshToken(Integration $integration): void
    {
        $creds = $integration->credentials;

        if (now()->lt($creds['expires_at'] ?? now()->subMinute())) {
            return; // still valid
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $creds['refresh_token'],
            'grant_type' => 'refresh_token',
        ]);

        if ($response->successful()) {
            $data = $response->json();
            $integration->update([
                'credentials' => [
                    ...$creds,
                    'access_token' => $data['access_token'],
                    'expires_at' => now()->addSeconds($data['expires_in'])->toIso8601String(),
                ],
            ]);
        } else {
            Log::error('GoogleCalendarService: token refresh failed', ['body' => $response->body()]);
        }
    }
}
