<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    /**
     * A task may only be created inside a project the requester can see:
     * platform managers, the project's creator, or members of the owning
     * team. Missing/unknown project_id falls through to rules() so the
     * caller still gets a proper 422 instead of a 403.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        $projectId = $this->input('project_id');

        // Anything that isn't a plain id (missing, array, junk) falls through
        // to rules(), which answers with the proper 422.
        if (! is_scalar($projectId)) {
            return true;
        }

        $project = Project::find($projectId);

        if (! $project) {
            return true;
        }

        return $project->isVisibleTo($user);
    }

    public function rules(): array
    {
        return [
            'project_id' => ['required', 'exists:projects,id'],
            'parent_task_id' => ['nullable', 'exists:tasks,id'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:backlog,todo,in_progress,review,testing,completed'],
            'priority' => ['sometimes', 'in:low,medium,high,critical'],
            'category' => ['nullable', 'string', 'max:100'],
            'due_date' => ['nullable', 'date'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_recurring' => ['sometimes', 'boolean'],
            'recurrence_rule' => ['nullable', 'array'],
        ];
    }
}
