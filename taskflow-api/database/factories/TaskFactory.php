<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'parent_task_id' => null,
            'assignee_id' => null,
            'created_by' => User::factory(),
            'title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'status' => fake()->randomElement(['backlog', 'todo', 'in_progress', 'review', 'testing', 'completed']),
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'category' => fake()->randomElement(['feature', 'bug', 'chore']),
            'due_date' => now()->addDays(7)->toDateString(),
            'position' => 0,
            'ai_generated' => false,
        ];
    }
}
