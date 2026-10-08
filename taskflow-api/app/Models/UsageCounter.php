<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UsageCounter extends Model
{
    protected $fillable = ['team_id', 'metric', 'period', 'count'];

    public static function period(): string
    {
        return now()->format('Y-m');
    }
}
