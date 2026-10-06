<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request)
    {
        return TeamResource::collection(
            $request->user()->isAdmin()
                ? Team::with('members:id,name,avatar_url')->get()
                : $request->user()->teams()->with('members:id,name,avatar_url')->get()
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
            'user_id' => ['required', 'exists:users,id'],
            'role_in_team' => ['sometimes', 'in:lead,member'],
        ]);

        $team->members()->syncWithoutDetaching([
            $data['user_id'] => ['role_in_team' => $data['role_in_team'] ?? 'member'],
        ]);

        return new TeamResource($team->load('members'));
    }

    public function removeMember(Request $request, Team $team, $userId)
    {
        $this->authorize('update', $team);

        $team->members()->detach($userId);

        return response()->json(['message' => 'Member removed.']);
    }
}
