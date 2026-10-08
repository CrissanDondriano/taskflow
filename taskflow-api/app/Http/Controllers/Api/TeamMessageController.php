<?php

namespace App\Http\Controllers\Api;

use App\Events\TeamMessageSent;
use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\TeamMessage;
use Illuminate\Http\Request;

class TeamMessageController extends Controller
{
    /**
     * GET /api/v1/teams/{team}/messages
     * Latest 100 messages, oldest first (chat order). Team members only —
     * strangers get 404 so team chatter stays hidden.
     */
    public function index(Request $request, Team $team)
    {
        $this->ensureMember($request, $team);

        $messages = TeamMessage::query()
            ->where('team_id', $team->id)
            ->with('user:id,name')
            ->latest()
            ->limit(100)
            ->get()
            ->reverse()
            ->values();

        return response()->json(['data' => $messages->map(fn ($m) => $this->shape($m))]);
    }

    /**
     * POST /api/v1/teams/{team}/messages
     * Team members only. Broadcasts on the team's channel (works when
     * Reverb is configured; the SPA also polls, so nothing is missed).
     */
    public function store(Request $request, Team $team)
    {
        $this->ensureMember($request, $team);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = TeamMessage::create([
            'team_id' => $team->id,
            'user_id' => $request->user()->id,
            'body' => trim($data['body']),
        ]);

        TeamMessageSent::dispatch($message);

        return response()->json(['data' => $this->shape($message->load('user:id,name'))], 201);
    }

    /**
     * DELETE /api/v1/teams/{team}/messages/{message}
     * Authors can remove their own messages; platform managers can remove
     * anyone's (moderation). The message must belong to the team.
     */
    public function destroy(Request $request, Team $team, TeamMessage $message)
    {
        $this->ensureMember($request, $team);

        if ($message->team_id !== $team->id) {
            return response()->json(['message' => 'Message not found.'], 404);
        }

        $user = $request->user();
        if ($message->user_id !== $user->id && ! $user->isManager()) {
            return response()->json(['message' => 'You can only delete your own messages.'], 403);
        }

        $message->delete();

        return response()->json(['message' => 'Message deleted.']);
    }

    protected function ensureMember(Request $request, Team $team): void
    {
        $user = $request->user();
        $isMember = $user->isManager()
            || $team->owner_id === $user->id
            || $team->members()->where('users.id', $user->id)->exists();

        if (! $isMember) {
            abort(404, 'Resource not found.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function shape(TeamMessage $message): array
    {
        return [
            'id' => $message->id,
            'team_id' => $message->team_id,
            'body' => $message->body,
            'created_at' => $message->created_at?->toISOString(),
            'user' => $message->user ? [
                'id' => $message->user->id,
                'name' => $message->user->name,
            ] : null,
        ];
    }
}
