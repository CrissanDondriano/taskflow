<?php

namespace Tests\Unit;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use App\Services\TaskAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class TaskAssignmentServiceTest extends TestCase
{
    use RefreshDatabase;

    private TaskAssignmentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TaskAssignmentService;
    }

    private function teamWith(array $titles): Team
    {
        $team = Team::factory()->create();
        foreach ($titles as $i => $title) {
            $user = User::factory()->create();
            $user->forceFill(['job_title' => $title])->save();
            $team->members()->attach($user->id, ['role_in_team' => $i === 0 ? 'lead' : 'member']);
        }

        return $team;
    }

    public function test_exact_title_match_assigns_case_insensitively(): void
    {
        $team = $this->teamWith(['Designer', 'Developer']);

        $result = $this->service->assign(
            [['title' => 'Logo', 'required_role' => 'designer']],
            $team
        );

        $this->assertFalse($result[0]['needs_assignee']);
        $this->assertSame('Designer', $team->members()->find($result[0]['assignee_id'])->job_title);
    }

    #[DataProvider('synonymProvider')]
    public function test_synonyms_resolve_to_the_canonical_title(string $variant, string $title): void
    {
        $team = $this->teamWith([$title]);

        $result = $this->service->assign(
            [['title' => 'Work', 'required_role' => $variant]],
            $team
        );

        $this->assertFalse($result[0]['needs_assignee']);
        $this->assertNotNull($result[0]['assignee_id']);
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function synonymProvider(): array
    {
        return [
            'accounting to Accountant' => ['accounting', 'Accountant'],
            'UI/UX to Designer' => ['UI/UX', 'Designer'],
            'dev to Developer' => ['dev', 'Developer'],
            'engineer to Developer' => ['engineer', 'Developer'],
            'programmer to Developer' => ['programmer', 'Developer'],
            'tester to QA' => ['tester', 'QA'],
            'pm to Project Manager' => ['pm', 'Project Manager'],
            'growth to Marketing' => ['growth', 'Marketing'],
            'helpdesk to Support' => ['helpdesk', 'Support'],
        ];
    }

    public function test_fewest_open_tasks_wins_with_deterministic_ties(): void
    {
        $team = $this->teamWith(['Developer', 'Developer']);
        [$busy, $free] = $team->members()->orderBy('users.id')->pluck('users.id')->all();

        $project = Project::factory()->create(['team_id' => $team->id, 'created_by' => $busy]);
        Task::factory()->create(['project_id' => $project->id, 'created_by' => $busy, 'assignee_id' => $busy, 'status' => 'todo']);
        Task::factory()->create(['project_id' => $project->id, 'created_by' => $busy, 'assignee_id' => $busy, 'status' => 'in_progress']);
        // Completed work doesn't count against anyone.
        Task::factory()->create(['project_id' => $project->id, 'created_by' => $free, 'assignee_id' => $free, 'status' => 'completed']);

        $result = $this->service->assign(
            [['title' => 'Feature', 'required_role' => 'Developer']],
            $team
        );

        $this->assertSame($free, $result[0]['assignee_id']);
        $this->assertSame($team->members()->find($free)->name, $result[0]['assignee_name']);
    }

    public function test_no_match_leaves_the_row_unassigned_and_flagged(): void
    {
        $team = $this->teamWith(['Designer']);

        $result = $this->service->assign(
            [['title' => 'Audit', 'required_role' => 'Accountant']],
            $team
        );

        $this->assertTrue($result[0]['needs_assignee']);
        $this->assertNull($result[0]['assignee_id']);
        $this->assertNull($result[0]['assignee_name']);
    }

    public function test_blank_role_is_unassigned_not_matched(): void
    {
        $team = $this->teamWith(['Designer']);

        $result = $this->service->assign([['title' => 'Misc']], $team);

        $this->assertTrue($result[0]['needs_assignee']);
    }

    public function test_team_without_members_flags_everything(): void
    {
        $team = Team::factory()->create();

        $result = $this->service->assign(
            [['title' => 'Work', 'required_role' => 'Developer']],
            $team
        );

        $this->assertTrue($result[0]['needs_assignee']);
    }
}
