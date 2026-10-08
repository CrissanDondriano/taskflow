<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Cashier\Billable;

class Team extends Model
{
    use Billable, HasFactory;

    protected $fillable = ['name', 'description', 'owner_id', 'plan_id'];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members()
    {
        return $this->belongsToMany(User::class)->withPivot('role_in_team')->withTimestamps();
    }

    /**
     * Is this user part of the team? Covers both the pivot table and the
     * owner (owners are not required to appear in the members pivot).
     * Used by policies and query scopes for per-team visibility.
     */
    public function hasMember(User $user): bool
    {
        if ($this->owner_id === $user->id) {
            return true;
        }

        return $this->members()->where('users.id', $user->id)->exists();
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    public function integrations()
    {
        return $this->hasMany(Integration::class);
    }

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * The team's effective plan — explicit plan_id, or Free when none was
     * ever assigned (older teams, teams created before billing existed).
     */
    public function resolvePlan(): Plan
    {
        return $this->plan ?? Plan::free();
    }
}
