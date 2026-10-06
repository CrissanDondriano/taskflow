<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => null,
            'created_by' => User::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'status' => 'active',
            'priority' => fake()->randomElement(['low', 'medium', 'high', 'critical']),
            'start_date' => now()->toDateString(),
            'deadline' => now()->addDays(30)->toDateString(),
            'health_score' => 100,
        ];
    }
}
