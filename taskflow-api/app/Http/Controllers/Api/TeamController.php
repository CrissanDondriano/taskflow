<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request)
    {
        // email must be in the member select — TeamResource maps it, and the
        // previous narrower select (id,name,avatar_url) rendered null emails
        // in every index response.
        return TeamResource::collection(
            $request->user()->isAdmin()
                ? Team::with('members:id,name,email')->paginate($this->perPage($request))
                : $request->user()->teams()->with('members:id,name,email')->paginate($this->perPage($request))
        );
    }

    public function store(Request $request)
    {
        $this->authorize('create', Team::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $team = Team::create([...$data, 'owner_id' => $request->user()->id]);
        $team->members()->attach($request->user()->id, ['role_in_team' => 'lead']);

        return (new TeamResource($team))->response()->setStatusCode(201);
    }

    public function addMember(Request $request, Team $team)
    {
        $this->authorize('update', $team);

        $data = $request->validate([
            // Either an id (undo flows already know it) or an email (the
            // invite form only collects what the invited person typed at
            // signup). Exactly one is required.
            'user_id' => ['required_without:email', 'nullable', 'exists:users,id'],
            'email' => ['required_without:user_id', 'nullable', 'email', 'exists:users,email'],
            'role_in_team' => ['sometimes', 'in:lead,member'],
        ]);

        $memberId = $data['user_id'] ?? User::where('email', $data['email'])->value('id');

        $team->members()->syncWithoutDetaching([
            $memberId => ['role_in_team' => $data['role_in_team'] ?? 'member'],
        ]);

        return new TeamResource($team->load('members'));
    }

    public function removeMember(Request $request, Team $team, string $userId)
    {
        $this->authorize('update', $team);

        // Route params arrive as strings — reject garbage before comparing.
        if (! ctype_digit($userId)) {
            return response()->json(['message' => 'That user is not a member of this team.'], 404);
        }

        $id = (int) $userId;

        if ($team->owner_id === $id) {
            return response()->json(['message' => 'The team owner cannot be removed.'], 422);
        }

        if (! $team->members()->where('users.id', $id)->exists()) {
            return response()->json(['message' => 'That user is not a member of this team.'], 404);
        }

        $team->members()->detach($id);

        return response()->json(['message' => 'Member removed.']);
    }
}
