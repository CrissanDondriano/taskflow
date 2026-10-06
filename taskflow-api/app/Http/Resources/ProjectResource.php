<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'team_id' => $this->team_id,
            'created_by' => $this->created_by,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'priority' => $this->priority,
            'start_date' => $this->start_date?->toDateString(),
            'deadline' => $this->deadline?->toDateString(),
            'health_score' => $this->health_score,
            'progress_percent' => $this->when(isset($this->progress_percent), fn () => $this->progress_percent),
            'is_overdue' => $this->when(isset($this->is_overdue), fn () => $this->is_overdue),
            'tasks_count' => $this->whenCounted('tasks'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'team' => $this->whenLoaded('team', fn () => [
                'id' => $this->team->id,
                'name' => $this->team->name,
            ]),
            'tasks' => TaskResource::collection($this->whenLoaded('tasks')),
            'insights' => $this->whenLoaded('insights', fn () => $this->insights->map(fn ($i) => [
                'id' => $i->id,
                'type' => $i->type,
                'content' => $i->content,
                'created_at' => $i->created_at?->toISOString(),
            ])),
        ];
    }
}
