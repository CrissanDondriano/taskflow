<?php

namespace App\Events;

use App\Models\TeamMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TeamMessageSent implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public function __construct(public TeamMessage $message) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('team.'.$this->message->team_id)];
    }

    public function broadcastAs(): string
    {
        return 'team-message.sent';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->message->loadMissing('user:id,name');

        return [
            'id' => $this->message->id,
            'team_id' => $this->message->team_id,
            'body' => $this->message->body,
            'created_at' => $this->message->created_at?->toISOString(),
            'user' => $this->message->user ? [
                'id' => $this->message->user->id,
                'name' => $this->message->user->name,
            ] : null,
        ];
    }
}
