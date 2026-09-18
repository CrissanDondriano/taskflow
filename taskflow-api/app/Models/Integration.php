<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Integration extends Model
{
    protected $fillable = ['team_id', 'connected_by', 'provider', 'credentials', 'is_active', 'connected_at'];

    protected function casts(): array
    {
        return [
            'credentials' => 'encrypted:array',
            'connected_at' => 'datetime',
        ];
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function connector()
    {
        return $this->belongsTo(User::class, 'connected_by');
    }
}
