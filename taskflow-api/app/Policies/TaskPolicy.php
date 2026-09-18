<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function update(User $user, Task $task): bool
    {
        return $user->isManager()
            || $task->assignee_id === $user->id
            || $task->created_by === $user->id;
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->isManager() || $task->created_by === $user->id;
    }
}
