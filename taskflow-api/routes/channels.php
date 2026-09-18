<?php

use App\Models\Team;
use Illuminate\Support\Facades\Broadcast;

// Personal channel: a user's own assigned-task and reminder notifications.
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Team channel: AI risk alerts, project-wide activity for anyone on the team.
Broadcast::channel('team.{teamId}', function ($user, $teamId) {
    return Team::where('id', $teamId)
        ->whereHas('members', fn ($q) => $q->where('users.id', $user->id))
        ->exists();
});
