<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Integration;
use App\Models\Team;
use App\Services\SlackService;
use Illuminate\Http\Request;

class IntegrationController extends Controller
{
    public function index(Team $team)
    {
        $this->authorize('update', $team);

        return response()->json(
            $team->integrations()->get(['id', 'provider', 'is_active', 'connected_at'])
        );
    }

    /**
     * Connect Slack via an Incoming Webhook URL (simplest path — no OAuth
     * app review needed). Swap this for a full OAuth flow later if you
     * want channel picking / slash commands.
     */
    public function connectSlack(Request $request, Team $team)
    {
        $this->authorize('update', $team);

        $data = $request->validate([
            'webhook_url' => ['required', 'url', 'starts_with:https://hooks.slack.com/'],
            'channel' => ['nullable', 'string'],
        ]);

        $integration = Integration::updateOrCreate(
            ['team_id' => $team->id, 'provider' => 'slack'],
            [
                'connected_by' => $request->user()->id,
                'credentials' => ['webhook_url' => $data['webhook_url'], 'channel' => $data['channel'] ?? null],
                'is_active' => true,
                'connected_at' => now(),
            ]
        );

        // Confirm the webhook actually works before telling the user it's connected.
        $ok = app(SlackService::class)->notify($team, ':wave: TaskFlow AI is now connected to this channel.');

        if (! $ok) {
            $integration->update(['is_active' => false]);
            return response()->json(['message' => 'Could not reach that Slack webhook. Double-check the URL.'], 422);
        }

        return response()->json($integration);
    }

    public function disconnect(Request $request, Team $team, string $provider)
    {
        $this->authorize('update', $team);

        Integration::where('team_id', $team->id)->where('provider', $provider)->delete();

        return response()->json(['message' => ucfirst($provider) . ' disconnected.']);
    }
}
