<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    /**
     * Any signed-in user may create a team for themselves (register() issues
     * role=member, and the SPA assumes an implicit team per account).
     * Management of an existing team stays restricted in update() below.
     */
    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Team $team): bool
    {
        return $user->isAdmin() || $team->owner_id === $user->id;
    }
}
