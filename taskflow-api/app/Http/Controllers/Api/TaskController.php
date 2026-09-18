<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Task;
use App\Notifications\TaskAssignedNotification;
use App\Services\GoogleCalendarService;
use App\Services\OutlookCalendarService;
use App\Services\SlackService;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(
        protected SlackService $slack,
        protected GoogleCalendarService $googleCalendar,
        protected OutlookCalendarService $outlookCalendar,
    ) {}

    protected function syncCalendars(Task $task): void
    {
        if (! $task->due_date) {
            return;
        }
        $this->googleCalendar->syncTaskDeadline($task);
        $this->outlookCalendar->syncTaskDeadline($task);
    }

    public function index(Request $request)
    {
        $tasks = Task::query()
            ->when($request->project_id, fn ($q) => $q->where('project_id', $request->project_id))
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->when($request->assignee_id, fn ($q) => $q->where('assignee_id', $request->assignee_id))
            ->when($request->priority, fn ($q) => $q->where('priority', $request->priority))
            ->whereNull('parent_task_id')
            ->with(['assignee:id,name,avatar_url', 'subtasks'])
            ->orderBy('position')
            ->get();

        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'parent_task_id' => ['nullable', 'exists:tasks,id'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:backlog,todo,in_progress,review,testing,completed'],
            'priority' => ['sometimes', 'in:low,medium,high,critical'],
            'category' => ['nullable', 'string', 'max:100'],
            'due_date' => ['nullable', 'date'],
            'is_recurring' => ['sometimes', 'boolean'],
            'recurrence_rule' => ['nullable', 'array'],
        ]);

        $task = Task::create([...$data, 'created_by' => $request->user()->id]);
        $task->load('assignee:id,name,avatar_url', 'project.team');

        ActivityLog::record('created', $task, "{$request->user()->name} created task \"{$task->title}\"");

        if ($task->assignee_id) {
            $this->slack->taskAssigned($task);
            $task->assignee->notify(new TaskAssignedNotification($task));
        }

        $this->syncCalendars($task);

        return response()->json($task, 201);
    }

    public function show(Task $task)
    {
        return response()->json($task->load(['assignee', 'creator', 'subtasks', 'comments.user', 'attachments']));
    }

    public function update(Request $request, Task $task)
    {
        $this->authorize('update', $task);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assignee_id' => ['nullable', 'exists:users,id'],
            'status' => ['sometimes', 'in:backlog,todo,in_progress,review,testing,completed'],
            'priority' => ['sometimes', 'in:low,medium,high,critical'],
            'category' => ['nullable', 'string', 'max:100'],
            'due_date' => ['nullable', 'date'],
        ]);

        $wasAssignee = $task->assignee_id;
        $wasCompleted = $task->status === 'completed';

        if (($data['status'] ?? null) === 'completed' && ! $wasCompleted) {
            $data['completed_at'] = now();
        }

        $task->update($data);
        $task->load('project.team', 'assignee:id,name,avatar_url');
        ActivityLog::record('updated', $task, "{$request->user()->name} updated task \"{$task->title}\"");

        if ($task->assignee_id && $task->assignee_id !== $wasAssignee) {
            $this->slack->taskAssigned($task);
            $task->assignee->notify(new TaskAssignedNotification($task));
        }

        if ($task->status === 'completed' && ! $wasCompleted) {
            $this->slack->taskCompleted($task);
        }

        if (array_key_exists('due_date', $data)) {
            $this->syncCalendars($task);
        }

        return response()->json($task);
    }

    /**
     * Dedicated endpoint for Kanban drag-and-drop: move a task to a new
     * column and position in one call.
     */
    public function move(Request $request, Task $task)
    {
        $this->authorize('update', $task);

        $data = $request->validate([
            'status' => ['required', 'in:backlog,todo,in_progress,review,testing,completed'],
            'position' => ['required', 'integer', 'min:0'],
        ]);

        $wasCompleted = $task->status === 'completed';

        $task->update([
            ...$data,
            'completed_at' => $data['status'] === 'completed' && ! $wasCompleted ? now() : $task->completed_at,
        ]);

        ActivityLog::record(
            'moved',
            $task,
            "{$request->user()->name} moved \"{$task->title}\" to " . str_replace('_', ' ', $data['status'])
        );

        if ($data['status'] === 'completed' && ! $wasCompleted) {
            $task->load('project.team');
            $this->slack->taskCompleted($task);
        }

        return response()->json($task);
    }

    public function destroy(Request $request, Task $task)
    {
        $this->authorize('delete', $task);

        $task->delete();
        ActivityLog::record('deleted', $task, "{$request->user()->name} deleted task \"{$task->title}\"");

        return response()->json(['message' => 'Task deleted.']);
    }

    public function addComment(Request $request, Task $task)
    {
        $data = $request->validate(['body' => ['required', 'string']]);

        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return response()->json($comment->load('user:id,name,avatar_url'), 201);
    }

    public function addAttachment(Request $request, Task $task)
    {
        $request->validate(['file' => ['required', 'file', 'max:10240']]);

        $file = $request->file('file');
        $path = $file->store("tasks/{$task->id}", 'public');

        $attachment = $task->attachments()->create([
            'user_id' => $request->user()->id,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);

        return response()->json($attachment, 201);
    }
}
