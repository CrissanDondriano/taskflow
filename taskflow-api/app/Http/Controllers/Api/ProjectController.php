<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $projects = Project::query()
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->team_id, fn ($q) => $q->where('team_id', $request->team_id))
            ->withCount('tasks')
            ->latest()
            ->paginate(20);

        $projects->getCollection()->transform(function ($project) {
            $project->progress_percent = $project->progressPercent();
            $project->is_overdue = $project->isOverdue();
            return $project;
        });

        return response()->json($projects);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Project::class);

        $data = $request->validate([
            'team_id' => ['nullable', 'exists:teams,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['sometimes', 'in:low,medium,high,critical'],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $project = Project::create([...$data, 'created_by' => $request->user()->id]);

        ActivityLog::record('created', $project, "{$request->user()->name} created project \"{$project->name}\"");

        return response()->json($project, 201);
    }

    public function show(Project $project)
    {
        $project->load(['tasks.assignee:id,name', 'team', 'insights']);
        $project->progress_percent = $project->progressPercent();
        $project->is_overdue = $project->isOverdue();

        return response()->json($project);
    }

    public function update(Request $request, Project $project)
    {
        $this->authorize('update', $project);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:active,completed,archived'],
            'priority' => ['sometimes', 'in:low,medium,high,critical'],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date'],
        ]);

        $project->update($data);
        ActivityLog::record('updated', $project, "{$request->user()->name} updated project \"{$project->name}\"");

        return response()->json($project);
    }

    public function destroy(Request $request, Project $project)
    {
        $this->authorize('delete', $project);

        $project->update(['status' => 'archived']);
        ActivityLog::record('archived', $project, "{$request->user()->name} archived project \"{$project->name}\"");

        return response()->json(['message' => 'Project archived.']);
    }
}
