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
        $admin = User::create([
            'name' => 'Alex Rivera',
            'email' => 'admin@taskflow.ai',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'job_title' => 'Administrator',
        ]);

        $manager = User::create([
            'name' => 'Maya Reyes',
            'email' => 'manager@taskflow.ai',
            'password' => Hash::make('password'),
            'role' => 'manager',
            'job_title' => 'Project Manager',
        ]);

        $member = User::create([
            'name' => 'Daniel Cruz',
            'email' => 'member@taskflow.ai',
            'password' => Hash::make('password'),
            'role' => 'member',
            'job_title' => 'Full-stack Developer',
        ]);

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
}
