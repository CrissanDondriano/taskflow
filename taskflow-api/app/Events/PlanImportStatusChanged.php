<?php

namespace App\Events;

use App\Models\PlanImport;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlanImportStatusChanged implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(public PlanImport $import) {}

    /**
     * The owning team's channel (already authorized in routes/channels.php)
     * — every member, including the uploader, hears status changes.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('team.'.$this->import->team_id)];
    }

    public function broadcastAs(): string
    {
        return 'plan-import.status';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->import->id,
            'status' => $this->import->status,
            'tasks_count' => count($this->import->tasks()),
            'error_message' => $this->import->error_message,
        ];
    }
}
