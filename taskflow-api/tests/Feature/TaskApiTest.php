<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_tasks_index_returns_paginated_collection(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id]);

        Task::factory()->count(3)->create([
            'project_id' => $project->id,
            'created_by' => $user->id,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/tasks');

        $response->assertOk()
            ->assertJsonStructure([
                'data',
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'per_page', 'total'],
            ]);

        $this->assertCount(3, $response->json('data'));
        $this->assertEquals(20, $response->json('meta.per_page'));
    }

    public function test_tasks_index_requires_authentication(): void
    {
        $this->getJson('/api/v1/tasks')->assertUnauthorized();
    }

    public function test_task_can_be_created(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/tasks', [
            'project_id' => $project->id,
            'title' => 'My new task',
            'priority' => 'high',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'My new task')
            ->assertJsonPath('data.priority', 'high');
    }

    public function test_task_can_be_soft_deleted_and_restored(): void
    {
        $user = User::factory()->create();
        $project = Project::factory()->create(['created_by' => $user->id]);

        $task = Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $user->id,
        ]);

        Sanctum::actingAs($user);

        $this->deleteJson("/api/v1/tasks/{$task->id}")->assertOk();

        $this->assertSoftDeleted('tasks', ['id' => $task->id]);

        $task->restore();
        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'deleted_at' => null]);
    }
}
