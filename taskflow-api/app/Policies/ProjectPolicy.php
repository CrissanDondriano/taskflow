<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function view(User $user, Project $project): bool
    {
        return $project->isVisibleTo($user);
    }

    /**
     * Any signed-in user may start a workspace of their own — the SPA
     * treats every account as an owner of an implicit team/project, and
     * register() always issues role=member, so gating this on isManager()
     * would leave ordinary users unable to create a single task. Data
     * stays tenancy-safe regardless: visibility is enforced by
     * Project::isVisibleTo (creator / team member / manager) on every read.
     */
    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Project $project): bool
    {
        return $user->isManager() || $project->created_by === $user->id;
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->isManager() || $project->created_by === $user->id;
    }
}
