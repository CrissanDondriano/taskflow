<?php

namespace Tests\Feature;

use App\Models\AiInsight;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiAssistantApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_ask_fails_gracefully_when_api_key_is_missing(): void
    {
        config(['services.openai.key' => null]);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/v1/ai/ask', ['question' => 'What should I work on today?']);

        $response->assertOk()->assertJsonStructure(['answer']);
        $this->assertStringContainsString('AI is not configured', $response->json('answer'));
    }

    public function test_meeting_notes_works_without_a_project_id(): void
    {
        config(['services.openai.key' => null]);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/v1/ai/meeting-notes', [
            'notes' => 'Alice ships the fix by Friday.',
        ]);

        $response->assertOk()->assertJsonStructure(['error']);

        // A failed AI call must not persist an empty insight row.
        $this->assertSame(0, AiInsight::count());
    }

    public function test_meeting_notes_requires_project_id_when_creating_tasks(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/ai/meeting-notes', [
            'notes' => 'Alice ships the fix by Friday.',
            'create_tasks' => true,
        ])->assertUnprocessable();
    }
}
