<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Response-envelope consistency: record/collection payloads come back as
 * {data: ...} (with {meta} for paginated indexes), matching the resource
 * envelope the SPA already consumes. Action acknowledgements stay {message}.
 */
class ResponseEnvelopeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function world(): array
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        $project = Project::factory()->create(['team_id' => $team->id, 'created_by' => $owner->id]);
        $task = Task::factory()->create(['project_id' => $project->id, 'created_by' => $owner->id]);

        return compact('owner', 'team', 'project', 'task');
    }

    public function test_comments_and_attachments_use_the_data_envelope(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $this->postJson("/api/v1/tasks/{$w['task']->id}/comments", ['body' => 'Looks good'])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Looks good');

        Storage::fake('public');
        $this->post(
            "/api/v1/tasks/{$w['task']->id}/attachments",
            ['file' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain')]
        )
            ->assertCreated()
            ->assertJsonPath('data.original_name', 'notes.txt');
    }

    public function test_team_integrations_index_uses_the_data_envelope(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $this->getJson("/api/v1/teams/{$w['team']->id}/integrations")
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_connect_slack_uses_the_data_envelope(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        Http::fake(['hooks.slack.com/*' => Http::response('ok')]);

        $this->postJson("/api/v1/teams/{$w['team']->id}/integrations/slack", [
            'webhook_url' => 'https://hooks.slack.com/services/T000/B000/XXXX',
        ])
            ->assertOk()
            ->assertJsonPath('data.provider', 'slack');
    }

    public function test_notifications_use_the_data_and_meta_envelope(): void
    {
        $w = $this->world();

        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\TaskAtRiskNotification',
            'data' => json_encode(['title' => 'x']),
            'notifiable_type' => $w['owner']->getMorphClass(),
            'notifiable_id' => $w['owner']->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($w['owner']);

        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'last_page', 'per_page', 'total', 'from', 'to']])
            ->assertJsonPath('data.0.type', 'App\\Notifications\\TaskAtRiskNotification');

        $id = DB::table('notifications')->where('notifiable_id', $w['owner']->id)->value('id');
        $this->patchJson("/api/v1/notifications/{$id}/read")
            ->assertOk()
            ->assertJsonPath('data.id', $id);
    }

    public function test_admin_pagination_meta_is_complete(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'from', 'to', 'last_page', 'path', 'per_page', 'total']]);
    }
}
