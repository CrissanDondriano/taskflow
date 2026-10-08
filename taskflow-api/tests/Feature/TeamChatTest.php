<?php

namespace Tests\Feature;

use App\Events\TeamMessageSent;
use App\Models\Team;
use App\Models\TeamMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeamChatTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function world(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        $team->members()->attach($member->id, ['role_in_team' => 'member']);

        return compact('owner', 'member', 'team');
    }

    public function test_members_can_send_and_read_in_order_with_broadcast(): void
    {
        $w = $this->world();
        Event::fake([TeamMessageSent::class]);
        Sanctum::actingAs($w['member']);

        $this->postJson("/api/v1/teams/{$w['team']->id}/messages", ['body' => 'First'])
            ->assertCreated()
            ->assertJsonPath('data.body', 'First')
            ->assertJsonPath('data.user.name', $w['member']->name);

        Sanctum::actingAs($w['owner']);
        $this->postJson("/api/v1/teams/{$w['team']->id}/messages", ['body' => 'Second'])->assertCreated();

        $messages = $this->getJson("/api/v1/teams/{$w['team']->id}/messages")
            ->assertOk()
            ->json('data');

        $this->assertSame(['First', 'Second'], array_column($messages, 'body'));
        Event::assertDispatched(TeamMessageSent::class, 2);
    }

    public function test_strangers_get_404_not_403(): void
    {
        $w = $this->world();
        Sanctum::actingAs(User::factory()->create());

        $this->getJson("/api/v1/teams/{$w['team']->id}/messages")->assertNotFound();
        $this->postJson("/api/v1/teams/{$w['team']->id}/messages", ['body' => 'Hi'])->assertNotFound();
        $this->assertDatabaseCount('team_messages', 0);
    }

    public function test_message_validates_body(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['member']);

        $this->postJson("/api/v1/teams/{$w['team']->id}/messages", ['body' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');

        $this->postJson("/api/v1/teams/{$w['team']->id}/messages", ['body' => str_repeat('x', 2001)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');
    }

    public function test_authors_delete_own_but_not_others_messages(): void
    {
        $w = $this->world();
        $message = TeamMessage::create([
            'team_id' => $w['team']->id,
            'user_id' => $w['member']->id,
            'body' => 'Mine',
        ]);
        Sanctum::actingAs($w['owner']);

        // Owner isn't the author and isn't a platform manager → 403.
        $this->deleteJson("/api/v1/teams/{$w['team']->id}/messages/{$message->id}")->assertForbidden();

        Sanctum::actingAs($w['member']);
        $this->deleteJson("/api/v1/teams/{$w['team']->id}/messages/{$message->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Message deleted.');
        $this->assertDatabaseMissing('team_messages', ['id' => $message->id]);
    }

    public function test_managers_can_moderate_any_message(): void
    {
        $w = $this->world();
        $admin = User::factory()->create(['role' => 'admin']);
        $message = TeamMessage::create([
            'team_id' => $w['team']->id,
            'user_id' => $w['member']->id,
            'body' => 'Remove me',
        ]);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/teams/{$w['team']->id}/messages/{$message->id}")->assertOk();
        $this->assertDatabaseMissing('team_messages', ['id' => $message->id]);
    }

    public function test_message_from_another_team_is_404(): void
    {
        $w = $this->world();
        $other = Team::factory()->create();
        $message = TeamMessage::create([
            'team_id' => $other->id,
            'user_id' => $w['owner']->id,
            'body' => 'Elsewhere',
        ]);
        Sanctum::actingAs($w['owner']);

        $this->deleteJson("/api/v1/teams/{$w['team']->id}/messages/{$message->id}")->assertNotFound();
    }

    public function test_guests_are_unauthenticated(): void
    {
        $w = $this->world();

        $this->getJson("/api/v1/teams/{$w['team']->id}/messages")->assertUnauthorized();
        $this->postJson("/api/v1/teams/{$w['team']->id}/messages", ['body' => 'Hi'])->assertUnauthorized();
    }
}
