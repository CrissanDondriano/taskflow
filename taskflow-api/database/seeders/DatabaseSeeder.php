<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Demo data (with known credentials) must never reach a real
        // deployment — seeding in production would ship a default admin.
        if (app()->environment('production')) {
            return;
        }

        $this->call(PlanSeeder::class);
        $admin = $this->makeUser([
            'name' => 'Alex Rivera',
            'email' => 'admin@taskflow.ai',
            'password' => Hash::make('password'),
            'job_title' => 'Administrator',
        ], 'admin');

        $manager = $this->makeUser([
            'name' => 'Maya Reyes',
            'email' => 'manager@taskflow.ai',
            'password' => Hash::make('password'),
            'job_title' => 'Project Manager',
        ], 'manager');

        $member = $this->makeUser([
            'name' => 'Daniel Cruz',
            'email' => 'member@taskflow.ai',
            'password' => Hash::make('password'),
            'job_title' => 'Full-stack Developer',
        ], 'member');

        $team = Team::create([
            'name' => 'Platform Team',
            'description' => 'Core product and platform engineering',
            'owner_id' => $manager->id,
        ]);
        $team->members()->attach([$manager->id => ['role_in_team' => 'lead'], $member->id => ['role_in_team' => 'member']]);

        $project = Project::create([
            'team_id' => $team->id,
            'created_by' => $manager->id,
            'name' => 'Mobile App Redesign',
            'description' => 'Redesign the mobile onboarding and billing flows.',
            'priority' => 'high',
            'start_date' => now(),
            'deadline' => now()->addWeeks(6),
        ]);

        Task::create([
            'project_id' => $project->id,
            'assignee_id' => $member->id,
            'created_by' => $manager->id,
            'title' => 'Wireframe billing settings',
            'priority' => 'medium',
            'status' => 'todo',
            'due_date' => now()->addDays(2),
        ]);

        Task::create([
            'project_id' => $project->id,
            'assignee_id' => $member->id,
            'created_by' => $manager->id,
            'title' => 'Build AI risk-detection worker',
            'priority' => 'critical',
            'status' => 'in_progress',
            'due_date' => now(),
        ]);
    }

    /**
     * 'role' isn't mass-assignable on purpose (see User::$fillable), so the
     * seeder — the one trusted place that mints demo roles — sets it directly.
     */
    private function makeUser(array $attributes, string $role): User
    {
        $user = User::create($attributes);
        $user->forceFill(['role' => $role])->save();

        return $user;
    }
}
