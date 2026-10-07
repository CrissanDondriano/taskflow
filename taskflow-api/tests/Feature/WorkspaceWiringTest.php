<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Backend surface the SPA's Phase-2 API wiring relies on: ordinary members
 * must be able to create their own team/project (register() always issues
 * role=member), indexes must honour ?per_page= with a hard cap, team
 * members must arrive with their email selected, and invites must work by
 * email — the invite form only knows what the invited person signed up with.
 */
class WorkspaceWiringTest extends TestCase
{
    use RefreshDatabase;

    private function teamWithTasks(int $taskCount): array
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        $project = Project::factory()->create(['team_id' => $team->id, 'created_by' => $owner->id]);

        for ($i = 0; $i < $taskCount; $i++) {
            Task::factory()->create(['project_id' => $project->id, 'created_by' => $owner->id, 'position' => $i]);
        }

        return compact('owner', 'team', 'project');
    }

    public function test_member_can_create_their_own_project_and_team(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);

        $this->postJson('/api/v1/teams', ['name' => 'Members Team'])->assertCreated();
        $this->postJson('/api/v1/projects', ['name' => 'General'])->assertCreated();
    }

    public function test_task_index_honours_per_page_and_caps_it(): void
    {
        $w = $this->teamWithTasks(3);
        Sanctum::actingAs($w['owner']);

        $page = $this->getJson('/api/v1/tasks?per_page=2')->assertOk();
        $this->assertCount(2, $page->json('data'));
        $this->assertSame(2, $page->json('meta.per_page'));

        // Absurd values are clamped, not honoured.
        $capped = $this->getJson('/api/v1/tasks?per_page=5000')->assertOk();
        $this->assertSame(100, $capped->json('meta.per_page'));
    }

    public function test_project_index_honours_per_page(): void
    {
        $w = $this->teamWithTasks(1);
        Project::factory()->create(['team_id' => $w['team']->id, 'created_by' => $w['owner']->id]);
        Sanctum::actingAs($w['owner']);

        $page = $this->getJson('/api/v1/projects?per_page=1')->assertOk();
        $this->assertCount(1, $page->json('data'));
        $this->assertSame(1, $page->json('meta.per_page'));
    }

    public function test_team_index_is_paginated_and_includes_member_emails(): void
    {
        $owner = User::factory()->create(['email' => 'owner@example.test']);
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        Sanctum::actingAs($owner);

        $page = $this->getJson('/api/v1/teams')->assertOk();

        $this->assertCount(1, $page->json('data'));
        $this->assertArrayHasKey('meta', $page->json());
        $this->assertSame('owner@example.test', $page->json('data.0.members.0.email'));
    }

    public function test_team_member_can_be_invited_by_email(): void
    {
        $owner = User::factory()->create();
        $invitee = User::factory()->create(['email' => 'invitee@example.test']);
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        Sanctum::actingAs($owner);

        $response = $this->postJson("/api/v1/teams/{$team->id}/members", ['email' => 'invitee@example.test'])
            ->assertOk();

        $this->assertTrue(
            collect($response->json('data.members'))->pluck('id')->contains($invitee->id)
        );
        $this->assertDatabaseHas('team_user', ['team_id' => $team->id, 'user_id' => $invitee->id]);
    }

    public function test_invite_by_unknown_email_is_a_validation_error(): void
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        Sanctum::actingAs($owner);

        $this->postJson("/api/v1/teams/{$team->id}/members", ['email' => 'nobody@example.test'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_task_created_as_completed_carries_completed_at(): void
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        $project = Project::factory()->create(['team_id' => $team->id, 'created_by' => $owner->id]);
        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/v1/tasks', [
            'project_id' => $project->id,
            'title' => 'Already done',
            'status' => 'completed',
        ])->assertCreated();

        $this->assertNotNull(Task::find($response->json('data.id'))->completed_at);
    }
}
