<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiInsight extends Model
{
    protected $fillable = ['project_id', 'type', 'content', 'meta'];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
