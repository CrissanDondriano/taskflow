<?php

namespace App\Http\Controllers\Api;

use App\Billing\EnforcePlanLimits;
use App\Http\Controllers\Controller;
use App\Http\Resources\TeamResource;
use App\Models\AuditLog;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public function index(Request $request)
    {
        // email and job_title must be in the member select — TeamResource
        // maps both, and narrower selects rendered nulls in index responses.
        return TeamResource::collection(
            $request->user()->isAdmin()
                ? Team::with('members:id,name,email,job_title')->paginate($this->perPage($request))
                : $request->user()->teams()->with('members:id,name,email,job_title')->paginate($this->perPage($request))
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

        // Seat quota is per workspace — the owner counts even without a pivot
        // row. Re-adding someone already on the team is a no-op, not a seat.
        if (! $team->members()->where('users.id', $memberId)->exists()) {
            EnforcePlanLimits::for($team)->check('members');
        }

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

    /**
     * PATCH /api/v1/teams/{team}/members/{userId}
     * Set a member's job title. Owners/admins only (same `update` policy as
     * invites and removals) — members cannot grant themselves titles.
     * Accepts one of the JobTitles presets or any custom string; null clears.
     */
    public function updateMemberTitle(Request $request, Team $team, string $userId)
    {
        $this->authorize('update', $team);

        // Route params arrive as strings — reject garbage before comparing.
        if (! ctype_digit($userId)) {
            return response()->json(['message' => 'That user is not a member of this team.'], 404);
        }

        $id = (int) $userId;

        $member = $team->members()->where('users.id', $id)->first();
        if (! $member) {
            return response()->json(['message' => 'That user is not a member of this team.'], 404);
        }

        $data = $request->validate([
            'job_title' => ['nullable', 'string', 'max:100'],
        ]);

        $member->fill(['job_title' => $data['job_title'] ?? null])->save();

        AuditLog::record(
            'team.member_title_updated',
            $team,
            ['member_id' => $member->id, 'job_title' => $member->job_title],
            $request->user()->id
        );

        return new TeamResource($team->load('members'));
    }
}
