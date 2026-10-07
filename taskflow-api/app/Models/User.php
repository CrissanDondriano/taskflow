<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    // 'role' is intentionally NOT mass-assignable: role changes must go
    // through forceFill() in AdminController/seeder only, so a future
    // User::create($request->all()) can never grant privileges.
    protected $fillable = [
        'name', 'email', 'password', 'avatar_url', 'job_title',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isManager(): bool
    {
        return in_array($this->role, ['admin', 'manager']);
    }

    public function teams()
    {
        return $this->belongsToMany(Team::class)->withPivot('role_in_team')->withTimestamps();
    }

    public function ownedTeams()
    {
        return $this->hasMany(Team::class, 'owner_id');
    }

    public function assignedTasks()
    {
        return $this->hasMany(Task::class, 'assignee_id');
    }

    public function projectsCreated()
    {
        return $this->hasMany(Project::class, 'created_by');
    }

    /**
     * Users a performance report may include for $viewer: managers see the
     * whole directory; regular members see themselves plus colleagues who
     * share at least one team with them (never a stranger's numbers).
     */
    public function scopePerformanceFor(Builder $query, User $viewer): Builder
    {
        if ($viewer->isManager()) {
            return $query;
        }

        $teamIds = $viewer->teams()->pluck('teams.id');

        return $query->where(function (Builder $q) use ($viewer, $teamIds) {
            $q->where('id', $viewer->id)
                ->orWhereHas('teams', fn (Builder $t) => $t->whereIn('teams.id', $teamIds));
        });
    }
}
