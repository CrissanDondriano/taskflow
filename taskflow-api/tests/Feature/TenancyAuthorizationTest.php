<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Cross-team (tenancy) authorization matrix. Every read/write endpoint that
 * takes a project or task must refuse data from teams the requester doesn't
 * belong to, while still letting that team's members work normally.
 */
class TenancyAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Two isolated teams, each with one project and one task. Returns the
     * whole world so individual tests can act as any of the actors.
     *
     * @return array<string, mixed>
     */
    private function world(): array
    {
        $teamA = Team::factory()->create();
        $teamB = Team::factory()->create();

        $teamA->members()->attach($teamA->owner_id, ['role_in_team' => 'lead']);
        $teamB->members()->attach($teamB->owner_id, ['role_in_team' => 'lead']);

        $projectA = Project::factory()->create(['team_id' => $teamA->id, 'created_by' => $teamA->owner_id]);
        $projectB = Project::factory()->create(['team_id' => $teamB->id, 'created_by' => $teamB->owner_id]);

        $taskA = Task::factory()->create(['project_id' => $projectA->id, 'created_by' => $teamA->owner_id, 'status' => 'todo']);
        $taskB = Task::factory()->create(['project_id' => $projectB->id, 'created_by' => $teamB->owner_id, 'status' => 'todo']);

        return [
            'teamA' => $teamA,
            'teamB' => $teamB,
            'projectA' => $projectA,
            'projectB' => $projectB,
            'taskA' => $taskA,
            'taskB' => $taskB,
            'ownerA' => User::find($teamA->owner_id),
            'ownerB' => User::find($teamB->owner_id),
        ];
    }

    public function test_task_show_forbidden_across_teams(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->getJson("/api/v1/tasks/{$w['taskB']->id}")->assertForbidden();
        $this->getJson("/api/v1/tasks/{$w['taskA']->id}")->assertOk();
    }

    public function test_task_index_excludes_other_teams_tasks(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $response = $this->getJson('/api/v1/tasks')->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame($w['taskA']->id, $response->json('data.0.id'));
    }

    public function test_project_show_forbidden_across_teams(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->getJson("/api/v1/projects/{$w['projectB']->id}")->assertForbidden();
        $this->getJson("/api/v1/projects/{$w['projectA']->id}")->assertOk();
    }

    public function test_project_index_excludes_other_teams_projects(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $response = $this->getJson('/api/v1/projects')->assertOk();

        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame($w['projectA']->id, $response->json('data.0.id'));
    }

    public function test_member_cannot_create_task_in_another_teams_project(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->postJson('/api/v1/tasks', [
            'project_id' => $w['projectB']->id,
            'title' => 'Sneaky task',
        ])->assertForbidden();

        $this->assertDatabaseMissing('tasks', ['title' => 'Sneaky task']);
    }

    public function test_member_cannot_comment_on_another_teams_task(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->postJson("/api/v1/tasks/{$w['taskB']->id}/comments", [
            'body' => 'cross-team comment',
        ])->assertForbidden();
    }

    public function test_teamless_project_is_private_to_its_creator(): void
    {
        $creator = User::factory()->create();
        $stranger = User::factory()->create();
        $project = Project::factory()->create(['team_id' => null, 'created_by' => $creator->id]);

        Sanctum::actingAs($stranger);

        $this->getJson("/api/v1/projects/{$project->id}")->assertForbidden();
        $this->postJson('/api/v1/tasks', [
            'project_id' => $project->id,
            'title' => 'Not mine',
        ])->assertForbidden();

        Sanctum::actingAs($creator);
        $this->getJson("/api/v1/projects/{$project->id}")->assertOk();
    }

    public function test_ai_ask_refuses_another_teams_project(): void
    {
        config(['services.openai.key' => null]);
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->postJson('/api/v1/ai/ask', [
            'question' => 'What is happening in there?',
            'project_id' => $w['projectB']->id,
        ])->assertForbidden();
    }

    public function test_ai_generate_tasks_refuses_another_teams_project(): void
    {
        config(['services.openai.key' => null]);
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->postJson('/api/v1/ai/generate-tasks', [
            'project_id' => $w['projectB']->id,
            'goal' => 'Ship it',
            'create' => true,
        ])->assertForbidden();
    }

    public function test_ai_risks_refuses_another_teams_project(): void
    {
        config(['services.openai.key' => null]);
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->getJson("/api/v1/ai/risks?project_id={$w['projectB']->id}")->assertForbidden();
    }

    public function test_ai_meeting_notes_refuses_another_teams_project(): void
    {
        config(['services.openai.key' => null]);
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->postJson('/api/v1/ai/meeting-notes', [
            'notes' => 'Alice ships the fix by Friday.',
            'project_id' => $w['projectB']->id,
        ])->assertForbidden();
    }

    public function test_own_team_member_can_read_comment_and_create(): void
    {
        $w = $this->world();
        $member = User::factory()->create();
        $w['teamA']->members()->attach($member->id, ['role_in_team' => 'member']);

        Sanctum::actingAs($member);

        $this->getJson("/api/v1/tasks/{$w['taskA']->id}")->assertOk();

        $this->postJson("/api/v1/tasks/{$w['taskA']->id}/comments", [
            'body' => 'Looks good to me',
        ])->assertCreated();

        $this->postJson('/api/v1/tasks', [
            'project_id' => $w['projectA']->id,
            'title' => 'Member-created task',
        ])->assertCreated();
    }

    public function test_managers_and_admins_can_read_any_team(): void
    {
        $w = $this->world();
        $manager = User::factory()->create(['role' => 'manager']);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($manager);
        $this->getJson("/api/v1/tasks/{$w['taskB']->id}")->assertOk();
        $this->getJson("/api/v1/projects/{$w['projectB']->id}")->assertOk();

        Sanctum::actingAs($admin);
        $this->getJson("/api/v1/tasks/{$w['taskB']->id}")->assertOk();
    }

    public function test_completing_then_reopening_a_task_clears_completed_at(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        // via PATCH /tasks/{task}
        $this->patchJson("/api/v1/tasks/{$w['taskA']->id}", ['status' => 'completed'])->assertOk();
        $this->assertNotNull($w['taskA']->fresh()->completed_at);

        $this->patchJson("/api/v1/tasks/{$w['taskA']->id}", ['status' => 'in_progress'])->assertOk();
        $this->assertNull($w['taskA']->fresh()->completed_at);

        // via the kanban move endpoint
        $this->patchJson("/api/v1/tasks/{$w['taskA']->id}/move", [
            'status' => 'completed',
            'position' => 0,
        ])->assertOk();
        $this->assertNotNull($w['taskA']->fresh()->completed_at);

        $this->patchJson("/api/v1/tasks/{$w['taskA']->id}/move", [
            'status' => 'review',
            'position' => 0,
        ])->assertOk();
        $this->assertNull($w['taskA']->fresh()->completed_at);
    }

    public function test_task_creation_validates_required_fields(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->postJson('/api/v1/tasks', ['project_id' => $w['projectA']->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title']);
    }

    public function test_attachment_rejects_executable_content_and_accepts_documents(): void
    {
        Storage::fake('public');
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        $this->post("/api/v1/tasks/{$w['taskA']->id}/attachments", [
            'file' => UploadedFile::fake()->create('payload.svg', 10, 'image/svg+xml'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->post("/api/v1/tasks/{$w['taskA']->id}/attachments", [
            'file' => UploadedFile::fake()->create('report.pdf', 10, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();
    }
}
