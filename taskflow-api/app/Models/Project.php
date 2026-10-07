<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id', 'created_by', 'name', 'description', 'status',
        'priority', 'start_date', 'deadline', 'health_score',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'deadline' => 'date',
        ];
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function insights()
    {
        return $this->hasMany(AiInsight::class);
    }

    /**
     * Read visibility: platform managers see everything, the creator keeps
     * access, and anyone belonging to the owning team can see the project.
     * Teamless projects (created_by only) stay private to their creator.
     * The SQL twin of this check lives in scopeVisibleTo() — keep them in sync.
     */
    public function isVisibleTo(User $user): bool
    {
        if ($user->isManager() || $this->created_by === $user->id) {
            return true;
        }

        return $this->team !== null && $this->team->hasMember($user);
    }

    public function scopeVisibleTo($query, User $user)
    {
        if ($user->isManager()) {
            return $query;
        }

        return $query->where(function ($q) use ($user) {
            $q->where('created_by', $user->id)
                ->orWhereHas('team', function ($team) use ($user) {
                    $team->where(function ($inner) use ($user) {
                        $inner->where('owner_id', $user->id)
                            ->orWhereHas('members', fn ($m) => $m->where('users.id', $user->id));
                    });
                });
        });
    }

    public function progressPercent(): float
    {
        // Prefer counts already fetched by the caller (withCount on index,
        // the loaded relation on show) so list endpoints never issue two
        // COUNT queries per project.
        if (array_key_exists('tasks_count', $this->attributes)) {
            $total = (int) $this->tasks_count;
            $done = (int) ($this->completed_tasks_count ?? 0);
        } elseif ($this->relationLoaded('tasks')) {
            $total = $this->tasks->count();
            $done = $this->tasks->where('status', 'completed')->count();
        } else {
            $total = $this->tasks()->count();
            $done = $total > 0 ? $this->tasks()->where('status', 'completed')->count() : 0;
        }

        if ($total === 0) {
            return 0;
        }

        return round(($done / $total) * 100, 1);
    }

    public function isOverdue(): bool
    {
        return $this->deadline && $this->deadline->isPast() && $this->status !== 'completed';
    }
}
