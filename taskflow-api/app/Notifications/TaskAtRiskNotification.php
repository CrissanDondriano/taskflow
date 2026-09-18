<?php

namespace App\Notifications;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class TaskAtRiskNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(protected Project $project, protected string $summary, protected string $severity)
    {
    }

    public function via($notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray($notifiable): array
    {
        return [
            'type' => 'ai_risk_alert',
            'project_id' => $this->project->id,
            'project' => $this->project->name,
            'severity' => $this->severity,
            'message' => $this->summary,
        ];
    }

    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
