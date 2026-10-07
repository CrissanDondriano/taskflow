<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id', 'parent_task_id', 'assignee_id', 'created_by',
        'title', 'description', 'status', 'priority', 'category',
        'due_date', 'is_recurring', 'recurrence_rule', 'position',
        'ai_generated', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'is_recurring' => 'boolean',
            'ai_generated' => 'boolean',
            'recurrence_rule' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assignee_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parent()
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    public function subtasks()
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    public function comments()
    {
        return $this->hasMany(TaskComment::class);
    }

    public function attachments()
    {
        return $this->hasMany(TaskAttachment::class);
    }

    /**
     * A task is visible when its project is (see Project::isVisibleTo), or
     * when the user is directly its assignee/creator — matching TaskPolicy::view.
     */
    public function scopeVisibleTo($query, User $user)
    {
        if ($user->isManager()) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('assignee_id', $user->id)
                ->orWhere('created_by', $user->id)
                ->orWhereHas('project', fn ($p) => $p->visibleTo($user));
        });
    }

    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && $this->status !== 'completed';
    }
}
