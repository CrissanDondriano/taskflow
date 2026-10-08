<?php

namespace App\Http\Controllers\Api;

use App\Billing\EnforcePlanLimits;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\Team;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $projects = Project::query()
            ->visibleTo($request->user())
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->team_id, fn ($q) => $q->where('team_id', $request->team_id))
            ->withCount(['tasks', 'tasks as completed_tasks_count' => fn ($q) => $q->where('status', 'completed')])
            ->latest()
            ->paginate($this->perPage($request));

        // progressPercent() reads the counts above — no per-project queries.
        $projects->getCollection()->transform(function ($project) {
            $project->progress_percent = $project->progressPercent();
            $project->is_overdue = $project->isOverdue();

            return $project;
        });

        return ProjectResource::collection($projects);
    }

    public function store(StoreProjectRequest $request)
    {
        $this->authorize('create', Project::class);

        $data = $request->validated();

        // Plan quota is per workspace: the target team when given, else the
        // requester's own implicit workspace (first team) for personal
        // projects. No team at all means nothing to bill against — allow.
        $team = ! empty($data['team_id'])
            ? Team::find($data['team_id'])
            : $request->user()->ownedTeams()->first() ?? $request->user()->teams()->first();
        if ($team) {
            EnforcePlanLimits::for($team)->check('projects');
        }

        $project = Project::create([...$data, 'created_by' => $request->user()->id]);

        ActivityLog::record('created', $project, "{$request->user()->name} created project \"{$project->name}\"");

        return (new ProjectResource($project))->response()->setStatusCode(201);
    }

    public function show(Project $project)
    {
        $this->authorize('view', $project);

        $project->load(['tasks.assignee:id,name', 'team', 'insights']);
        $project->progress_percent = $project->progressPercent();
        $project->is_overdue = $project->isOverdue();

        return new ProjectResource($project);
    }

    public function update(UpdateProjectRequest $request, Project $project)
    {
        $this->authorize('update', $project);

        $data = $request->validated();

        $project->update($data);
        ActivityLog::record('updated', $project, "{$request->user()->name} updated project \"{$project->name}\"");

        return new ProjectResource($project);
    }

    public function destroy(Request $request, Project $project)
    {
        $this->authorize('delete', $project);

        $project->update(['status' => 'archived']);
        ActivityLog::record('archived', $project, "{$request->user()->name} archived project \"{$project->name}\"");

        return response()->json(['message' => 'Project archived.']);
    }
}
