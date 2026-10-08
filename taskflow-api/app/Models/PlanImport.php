<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlanImport extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_id', 'project_id', 'user_id', 'file_path', 'original_name',
        'status', 'extracted_text', 'result_json', 'error_message',
    ];

    protected function casts(): array
    {
        return [
            'result_json' => 'array',
        ];
    }

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_READY = 'ready';

    public const STATUS_FAILED = 'failed';

    public const STATUS_APPROVED = 'approved';

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Visible to platform managers and members of the owning team — the
     * same rule as every other team-scoped record (404s hide existence).
     */
    public function scopeVisibleTo($query, User $user)
    {
        if ($user->isManager()) {
            return $query;
        }

        return $query->whereHas('team', fn ($t) => $t->whereHas(
            'members', fn ($m) => $m->where('users.id', $user->id)
        ));
    }

    /** Extracted task rows (empty until the job marks the import ready). */
    public function tasks(): array
    {
        return $this->result_json['tasks'] ?? [];
    }
}
