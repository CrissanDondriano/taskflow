<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskCommentsTest extends TestCase
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
        $project = Project::factory()->create(['team_id' => $team->id, 'created_by' => $owner->id]);
        $task = Task::factory()->create(['project_id' => $project->id, 'created_by' => $owner->id]);

        return compact('owner', 'member', 'team', 'project', 'task');
    }

    public function test_comments_list_in_order_and_accept_new_ones(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['member']);

        $this->postJson("/api/v1/tasks/{$w['task']->id}/comments", ['body' => 'First!'])
            ->assertCreated()
            ->assertJsonPath('data.body', 'First!')
            ->assertJsonPath('data.user.name', $w['member']->name);

        Sanctum::actingAs($w['owner']);
        $this->postJson("/api/v1/tasks/{$w['task']->id}/comments", ['body' => 'Second.'])->assertCreated();

        $this->getJson("/api/v1/tasks/{$w['task']->id}/comments")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.body', 'First!')
            ->assertJsonPath('data.1.body', 'Second.');
    }

    public function test_comment_body_validates(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['member']);

        $this->postJson("/api/v1/tasks/{$w['task']->id}/comments", ['body' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');

        $this->postJson("/api/v1/tasks/{$w['task']->id}/comments", ['body' => str_repeat('x', 2001)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');
    }

    public function test_authors_delete_own_but_not_others_comments(): void
    {
        $w = $this->world();
        $comment = TaskComment::create([
            'task_id' => $w['task']->id,
            'user_id' => $w['member']->id,
            'body' => 'Mine',
        ]);
        Sanctum::actingAs($w['owner']);

        $this->deleteJson("/api/v1/tasks/{$w['task']->id}/comments/{$comment->id}")->assertForbidden();

        Sanctum::actingAs($w['member']);
        $this->deleteJson("/api/v1/tasks/{$w['task']->id}/comments/{$comment->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Comment deleted.');
        $this->assertDatabaseMissing('task_comments', ['id' => $comment->id]);
    }

    public function test_managers_can_moderate_any_comment(): void
    {
        $w = $this->world();
        $admin = User::factory()->create(['role' => 'admin']);
        $comment = TaskComment::create([
            'task_id' => $w['task']->id,
            'user_id' => $w['member']->id,
            'body' => 'Remove me',
        ]);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/v1/tasks/{$w['task']->id}/comments/{$comment->id}")->assertOk();
        $this->assertDatabaseMissing('task_comments', ['id' => $comment->id]);
    }

    public function test_cross_task_comment_is_404(): void
    {
        $w = $this->world();
        $otherTask = Task::factory()->create(['project_id' => $w['project']->id, 'created_by' => $w['owner']->id]);
        $comment = TaskComment::create([
            'task_id' => $otherTask->id,
            'user_id' => $w['member']->id,
            'body' => 'Elsewhere',
        ]);
        Sanctum::actingAs($w['owner']);

        $this->deleteJson("/api/v1/tasks/{$w['task']->id}/comments/{$comment->id}")->assertNotFound();
    }

    public function test_outsiders_cannot_touch_comments(): void
    {
        $w = $this->world();
        Sanctum::actingAs(User::factory()->create());

        // Outside the team the task itself is invisible (tenancy → 403/404).
        $this->getJson("/api/v1/tasks/{$w['task']->id}/comments")->assertForbidden();
        $this->postJson("/api/v1/tasks/{$w['task']->id}/comments", ['body' => 'Hi'])->assertForbidden();
    }
}
