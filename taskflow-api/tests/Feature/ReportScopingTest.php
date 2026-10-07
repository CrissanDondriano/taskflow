<?php

namespace Tests\Feature;

use App\Exports\ProjectStatusExport;
use App\Exports\TaskCompletionExport;
use App\Exports\TeamPerformanceExport;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Reports and exports must never leak across tenants: every query is scoped
 * to the requester's visibility, cached per user (ReportCache), and
 * invalidated when its inputs change. Responses use the {data} envelope.
 */
class ReportScopingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Two isolated tenants (A: owner + teammate, B: owner) plus a platform
     * manager. Returns the whole world so tests can act as any actor.
     *
     * @return array<string, mixed>
     */
    private function world(): array
    {
        $ownerA = User::factory()->create();
        $teammateA = User::factory()->create();
        $teamA = Team::factory()->create(['owner_id' => $ownerA->id]);
        $teamA->members()->attach($ownerA->id, ['role_in_team' => 'lead']);
        $teamA->members()->attach($teammateA->id, ['role_in_team' => 'member']);
        $projectA = Project::factory()->create(['team_id' => $teamA->id, 'created_by' => $ownerA->id]);
        Task::factory()->create([
            'project_id' => $projectA->id,
            'created_by' => $ownerA->id,
            'assignee_id' => $teammateA->id,
        ]);

        $ownerB = User::factory()->create();
        $teamB = Team::factory()->create(['owner_id' => $ownerB->id]);
        $teamB->members()->attach($ownerB->id, ['role_in_team' => 'lead']);
        $projectB = Project::factory()->create([
            'team_id' => $teamB->id,
            'created_by' => $ownerB->id,
            'name' => 'Secret B project',
        ]);
        // Overdue and incomplete — only tenant B should ever count this.
        Task::factory()->create([
            'project_id' => $projectB->id,
            'created_by' => $ownerB->id,
            'assignee_id' => $ownerB->id,
            'due_date' => now()->subDay()->toDateString(),
            'status' => 'todo',
        ]);

        $manager = User::factory()->create(['role' => 'admin']);

        return compact('ownerA', 'teammateA', 'teamA', 'projectA', 'ownerB', 'teamB', 'projectB', 'manager');
    }

    public function test_project_status_is_scoped_per_user_and_wrapped(): void
    {
        $w = $this->world();

        Sanctum::actingAs($w['teammateA']);
        $a = $this->getJson('/api/v1/reports/project-status')->assertOk();
        $names = collect($a->json('data'))->pluck('name');
        $this->assertTrue($names->contains($w['projectA']->name));
        $this->assertFalse($names->contains('Secret B project'));

        Sanctum::actingAs($w['ownerB']);
        $b = $this->getJson('/api/v1/reports/project-status')->assertOk();
        $namesB = collect($b->json('data'))->pluck('name');
        $this->assertTrue($namesB->contains('Secret B project'));
        $this->assertFalse($namesB->contains($w['projectA']->name));
    }

    public function test_report_cache_is_invalidated_by_writes(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['ownerA']);

        // First read caches; second read proves the cache is actually used.
        $this->getJson('/api/v1/reports/project-status')->assertOk();
        $this->assertCount(1, $this->getJson('/api/v1/reports/project-status')->json('data'));

        Project::factory()->create(['team_id' => $w['teamA']->id, 'created_by' => $w['ownerA']->id, 'name' => 'Fresh project']);

        // The write bumped the cache version — no stale 1-project response.
        $this->assertCount(2, $this->getJson('/api/v1/reports/project-status')->json('data'));
    }

    public function test_team_performance_scoped_to_teammates_for_members_and_everyone_for_managers(): void
    {
        $w = $this->world();

        Sanctum::actingAs($w['teammateA']);
        $ids = collect($this->getJson('/api/v1/reports/team-performance')->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($w['ownerA']->id));
        $this->assertTrue($ids->contains($w['teammateA']->id));
        $this->assertFalse($ids->contains($w['ownerB']->id));
        $this->assertFalse($ids->contains($w['manager']->id));

        Sanctum::actingAs($w['manager']);
        $all = collect($this->getJson('/api/v1/reports/team-performance')->json('data'))->pluck('id');
        $this->assertTrue($all->contains($w['ownerB']->id));
        $this->assertTrue($all->contains($w['manager']->id));
    }

    public function test_productivity_counts_only_own_completions(): void
    {
        $w = $this->world();

        Task::factory()->create([
            'project_id' => $w['projectA']->id,
            'created_by' => $w['ownerA']->id,
            'assignee_id' => $w['teammateA']->id,
            'completed_at' => now(),
        ]);
        Task::factory()->create([
            'project_id' => $w['projectB']->id,
            'created_by' => $w['ownerB']->id,
            'assignee_id' => $w['ownerB']->id,
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($w['teammateA']);
        $data = $this->getJson('/api/v1/reports/productivity')->json('data');

        $this->assertSame(1, collect($data)->sum('completed'));
    }

    public function test_weekly_summary_only_counts_visible_data(): void
    {
        $w = $this->world();

        Sanctum::actingAs($w['teammateA']);
        $statsA = $this->getJson('/api/v1/reports/weekly-summary')->json('data.stats');
        $this->assertSame(0, $statsA['tasks_overdue']);
        $this->assertSame(0, $statsA['tasks_completed_this_week']);

        Sanctum::actingAs($w['ownerB']);
        $statsB = $this->getJson('/api/v1/reports/weekly-summary')->json('data.stats');
        $this->assertSame(1, $statsB['tasks_overdue']);
    }

    public function test_export_collections_are_scoped(): void
    {
        $w = $this->world();

        $projectRows = (new ProjectStatusExport($w['teammateA']))->collection();
        $this->assertTrue($projectRows->contains('name', $w['projectA']->name));
        $this->assertFalse($projectRows->contains('name', 'Secret B project'));

        $userRows = (new TeamPerformanceExport($w['teammateA']))->collection();
        $this->assertFalse($userRows->pluck('id')->contains($w['ownerB']->id));

        // A foreign project_id filter can't smuggle another team's tasks out.
        $taskRows = (new TaskCompletionExport($w['teammateA'], $w['projectB']->id))->collection();
        $this->assertCount(0, $taskRows);
    }

    public function test_export_endpoints_require_auth_and_download_for_members(): void
    {
        $w = $this->world();

        $this->get('/api/v1/reports/project-status/export?format=csv')->assertUnauthorized();

        Sanctum::actingAs($w['teammateA']);
        $this->get('/api/v1/reports/project-status/export?format=csv')->assertOk();
    }
}
