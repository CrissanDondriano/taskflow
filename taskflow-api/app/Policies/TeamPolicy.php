<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    public function create(User $user): bool
    {
        return $user->isManager();
    }

    public function update(User $user, Team $team): bool
    {
        return $user->isAdmin() || $team->owner_id === $user->id;
    }
}
