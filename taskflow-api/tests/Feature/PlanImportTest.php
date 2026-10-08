<?php

namespace Tests\Feature;

use App\Events\PlanImportStatusChanged;
use App\Models\PlanImport;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PhpOffice\PhpWord\PhpWord;
use Tests\TestCase;

class PlanImportTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function world(): array
    {
        $owner = User::factory()->create();
        $designer = User::factory()->create();
        $designer->forceFill(['job_title' => 'Designer'])->save();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        $team->members()->attach($designer->id, ['role_in_team' => 'member']);
        $project = Project::factory()->create(['team_id' => $team->id, 'created_by' => $owner->id]);

        return compact('owner', 'designer', 'team', 'project');
    }

    private function realTextFile(string $name, string $contents): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'plan').'_'.$name;
        file_put_contents($path, $contents);

        return new UploadedFile($path, $name, 'text/plain', null, true);
    }

    private function realDocxFile(string $contents): UploadedFile
    {
        $phpWord = new PhpWord;
        $section = $phpWord->addSection();
        foreach (explode("\n", $contents) as $line) {
            $line = trim($line);
            if ($line !== '') {
                $section->addText($line);
            }
        }
        $path = tempnam(sys_get_temp_dir(), 'plan').'.docx';
        $phpWord->save($path, 'Word2007');

        return new UploadedFile(
            $path, 'plan.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true
        );
    }

    private function realPdfFile(array $lines): UploadedFile
    {
        // Minimal but well-formed PDF: pdfparser needs a valid xref table.
        $content = '';
        $y = 720;
        foreach ($lines as $line) {
            $escaped = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
            $content .= "BT /F1 12 Tf 72 {$y} Td ({$escaped}) Tj ET\n";
            $y -= 20;
        }
        $objects = [
            1 => '<< /Type /Catalog /Pages 2 0 R >>',
            2 => '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            3 => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            4 => '<< /Length '.strlen($content)." >>\nstream\n{$content}endstream",
            5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $num => $body) {
            $offsets[$num] = strlen($pdf);
            $pdf .= "{$num} 0 obj\n{$body}\nendobj\n";
        }
        $xrefAt = strlen($pdf);
        $pdf .= 'xref'."\n0 6\n".'0000000000 65535 f '."\n";
        for ($i = 1; $i <= 5; $i++) {
            $pdf .= sprintf('%010d 00000 n ', $offsets[$i])."\n";
        }
        $pdf .= 'trailer'."\n<< /Size 6 /Root 1 0 R >>\n".'startxref'."\n{$xrefAt}\n%%EOF";

        $path = tempnam(sys_get_temp_dir(), 'plan').'.pdf';
        file_put_contents($path, $pdf);

        return new UploadedFile($path, 'plan.pdf', 'application/pdf', null, true);
    }

    private function fakeExtraction(array $tasks): void
    {
        Http::fake([
            'api.openai.com/*' => Http::response(['choices' => [['message' => ['content' => json_encode(['tasks' => $tasks])]]]], 200),
        ]);
    }

    private function extractedRow(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Design homepage',
            'description' => 'New landing look',
            'required_role' => 'Designer',
            'priority' => 'high',
            'estimated_days' => 3,
            'depends_on' => [],
            'suggested_due_offset_days' => 5,
        ], $overrides);
    }

    public function test_txt_upload_extracts_assigns_and_broadcasts(): void
    {
        $w = $this->world();
        Storage::fake('local');
        Event::fake([PlanImportStatusChanged::class]);
        $this->fakeExtraction([$this->extractedRow()]);
        Sanctum::actingAs($w['owner']);

        $response = $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", [
            'file' => $this->realTextFile('plan.txt', "Homepage redesign\nNew landing look"),
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'ready');

        $tasks = $response->json('data.tasks');
        $this->assertCount(1, $tasks);
        // The team's Designer gets the row (no open tasks on either member).
        $this->assertSame($w['designer']->id, $tasks[0]['assignee_id']);
        $this->assertFalse($tasks[0]['needs_assignee']);

        Event::assertDispatched(PlanImportStatusChanged::class, 2); // processing + ready

        $this->assertDatabaseHas('plan_imports', [
            'team_id' => $w['team']->id,
            'status' => 'ready',
            'original_name' => 'plan.txt',
        ]);
    }

    public function test_docx_and_pdf_extractors_read_real_files(): void
    {
        $w = $this->world();
        Storage::fake('local');
        $this->fakeExtraction([$this->extractedRow(['title' => 'From file'])]);
        Sanctum::actingAs($w['owner']);

        $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", [
            'file' => $this->realDocxFile("Milestone one\nShip the thing"),
        ])->assertCreated()->assertJsonPath('data.status', 'ready');

        $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", [
            'file' => $this->realPdfFile(['Design homepage', 'Build login API']),
        ])->assertCreated()->assertJsonPath('data.status', 'ready');
    }

    public function test_empty_document_fails_with_a_friendly_message(): void
    {
        $w = $this->world();
        Storage::fake('local');
        Sanctum::actingAs($w['owner']);

        $response = $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", [
            'file' => $this->realTextFile('empty.txt', "   \n  "),
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'failed');
        $this->assertStringContainsString('OCR', (string) $response->json('data.error_message'));
    }

    public function test_upload_rejects_bad_files_and_strangers(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", [
            'file' => UploadedFile::fake()->create('evil.exe', 10, 'application/x-msdownload'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", [
            'file' => UploadedFile::fake()->create('big.pdf', 11265, 'application/pdf'),
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        Sanctum::actingAs(User::factory()->create());
        $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", [
            'file' => $this->realTextFile('plan.txt', 'Work'),
        ])->assertForbidden();
    }

    public function test_status_is_hidden_from_other_teams(): void
    {
        $w = $this->world();
        $import = PlanImport::factory()->create([
            'team_id' => $w['team']->id,
            'user_id' => $w['owner']->id,
            'status' => 'ready',
            'result_json' => ['tasks' => []],
        ]);

        Sanctum::actingAs(User::factory()->create());
        $this->getJson("/api/v1/plan-imports/{$import->id}")->assertNotFound();

        Sanctum::actingAs($w['designer']);
        $this->getJson("/api/v1/plan-imports/{$import->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'ready');
    }

    public function test_approve_creates_linked_tasks_in_a_transaction(): void
    {
        $w = $this->world();
        $import = PlanImport::factory()->create([
            'team_id' => $w['team']->id,
            'user_id' => $w['owner']->id,
            'status' => 'ready',
            'result_json' => ['tasks' => [$this->extractedRow()]],
        ]);
        Sanctum::actingAs($w['owner']);

        $response = $this->postJson("/api/v1/plan-imports/{$import->id}/approve", [
            'project_id' => $w['project']->id,
            'tasks' => [
                [
                    'title' => 'Design homepage',
                    'description' => 'New landing look',
                    'priority' => 'urgent',
                    'required_role' => 'Designer',
                    'assignee_id' => $w['designer']->id,
                    'suggested_due_offset_days' => 5,
                    'depends_on' => [],
                ],
                [
                    'title' => 'Build homepage',
                    'priority' => 'medium',
                    'assignee_id' => null,
                    'depends_on' => ['Design homepage'],
                ],
            ],
        ]);

        $response->assertCreated();
        $this->assertSame(2, $response->json('data.tasks_created'));

        $design = Task::where('title', 'Design homepage')->firstOrFail();
        $build = Task::where('title', 'Build homepage')->firstOrFail();

        // urgent mapped to the schema's critical; offset counted from today.
        $this->assertSame('critical', $design->priority);
        $this->assertSame(today()->addDays(5)->toDateString(), $design->due_date->toDateString());
        $this->assertSame($w['designer']->id, $design->assignee_id);
        $this->assertTrue($design->ai_generated);
        // Dependency linked through parent_task_id, not left as text.
        $this->assertSame($design->id, $build->parent_task_id);
        $this->assertNull($build->assignee_id);

        $this->assertSame('approved', $import->fresh()->status);

        // Approving twice would duplicate work — refused instead.
        $this->postJson("/api/v1/plan-imports/{$import->id}/approve", [
            'project_id' => $w['project']->id,
            'tasks' => [['title' => 'Again']],
        ])->assertUnprocessable();
    }

    public function test_approve_guards_status_project_and_assignees(): void
    {
        $w = $this->world();
        $stranger = User::factory()->create();
        $pending = PlanImport::factory()->create([
            'team_id' => $w['team']->id,
            'user_id' => $w['owner']->id,
            'status' => 'processing',
        ]);
        Sanctum::actingAs($w['owner']);

        // Still processing → 409, nothing created.
        $this->postJson("/api/v1/plan-imports/{$pending->id}/approve", [
            'project_id' => $w['project']->id,
            'tasks' => [['title' => 'Too soon']],
        ])->assertConflict();
        $this->assertSame(0, Task::count());

        $ready = PlanImport::factory()->create([
            'team_id' => $w['team']->id,
            'user_id' => $w['owner']->id,
            'status' => 'ready',
            'result_json' => ['tasks' => []],
        ]);

        // Assignee outside the team → 422.
        $this->postJson("/api/v1/plan-imports/{$ready->id}/approve", [
            'project_id' => $w['project']->id,
            'tasks' => [['title' => 'X', 'assignee_id' => $stranger->id]],
        ])->assertUnprocessable();

        // Another team's project → 403.
        $otherTeam = Team::factory()->create();
        $otherProject = Project::factory()->create(['team_id' => $otherTeam->id, 'created_by' => $stranger->id]);
        $this->postJson("/api/v1/plan-imports/{$ready->id}/approve", [
            'project_id' => $otherProject->id,
            'tasks' => [['title' => 'X']],
        ])->assertForbidden();

        $this->assertSame(0, Task::count());
    }

    public function test_invalid_ai_output_retries_once_then_skips_the_chunk(): void
    {
        $w = $this->world();
        Storage::fake('local');
        Http::fake([
            'api.openai.com/*' => Http::sequence()
                ->push(['choices' => [['message' => ['content' => 'not json at all']]]], 200)
                ->push(['choices' => [['message' => ['content' => json_encode(['tasks' => [$this->extractedRow()]])]]]], 200),
        ]);
        Sanctum::actingAs($w['owner']);

        $response = $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", [
            'file' => $this->realTextFile('plan.txt', 'Real work here'),
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'ready');
        $this->assertCount(1, $response->json('data.tasks'));
    }
}
