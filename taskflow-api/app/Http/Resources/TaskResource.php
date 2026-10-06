<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'parent_task_id' => $this->parent_task_id,
            'assignee_id' => $this->assignee_id,
            'created_by' => $this->created_by,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'category' => $this->category,
            'due_date' => $this->due_date?->toDateString(),
            'is_recurring' => $this->is_recurring,
            'recurrence_rule' => $this->recurrence_rule,
            'position' => $this->position,
            'ai_generated' => $this->ai_generated,
            'completed_at' => $this->completed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'assignee' => $this->whenLoaded('assignee', fn () => [
                'id' => $this->assignee->id,
                'name' => $this->assignee->name,
                'avatar_url' => $this->assignee->avatar_url,
            ]),
            'project' => $this->whenLoaded('project', fn () => [
                'id' => $this->project->id,
                'name' => $this->project->name,
            ]),
            'subtasks' => TaskResource::collection($this->whenLoaded('subtasks')),
            'comments' => $this->whenLoaded('comments', fn () => $this->comments->map(fn ($c) => [
                'id' => $c->id,
                'body' => $c->body,
                'user' => [
                    'id' => $c->user->id,
                    'name' => $c->user->name,
                ],
                'created_at' => $c->created_at?->toISOString(),
            ])),
            'attachments' => $this->whenLoaded('attachments', fn () => $this->attachments->map(fn ($a) => [
                'id' => $a->id,
                'original_name' => $a->original_name,
                'mime_type' => $a->mime_type,
                'size' => $a->size,
                'created_at' => $a->created_at?->toISOString(),
            ])),
        ];
    }
}
