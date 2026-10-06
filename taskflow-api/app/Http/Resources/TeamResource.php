<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'owner_id' => $this->owner_id,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'owner' => $this->whenLoaded('owner', fn () => [
                'id' => $this->owner->id,
                'name' => $this->owner->name,
            ]),
            'members' => $this->whenLoaded('members', fn () => $this->members->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->name,
                'email' => $m->email,
                'role_in_team' => $m->pivot->role_in_team,
            ])),
            'projects' => ProjectResource::collection($this->whenLoaded('projects')),
            'integrations' => $this->whenLoaded('integrations', fn () => $this->integrations->map(fn ($i) => [
                'id' => $i->id,
                'provider' => $i->provider,
                'is_active' => $i->is_active,
                'connected_at' => $i->connected_at?->toISOString(),
            ])),
        ];
    }
}
