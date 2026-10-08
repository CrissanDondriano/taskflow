<?php

namespace Tests\Feature;

use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * PATCH /teams/{team}/members/{user} — job titles. Owners and admins may
 * set any preset or custom title (or clear it); ordinary members may not
 * edit titles, including their own.
 */
class MemberTitleTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function world(): array
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        $team->members()->attach($member->id, ['role_in_team' => 'member']);

        return compact('owner', 'member', 'team');
    }

    public function test_owner_can_set_a_preset_title(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $response = $this->patchJson("/api/v1/teams/{$w['team']->id}/members/{$w['member']->id}", [
            'job_title' => 'Designer',
        ])->assertOk();

        $members = collect($response->json('data.members'));
        $this->assertSame('Designer', $members->firstWhere('id', $w['member']->id)['job_title']);

        $this->assertDatabaseHas('users', ['id' => $w['member']->id, 'job_title' => 'Designer']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'team.member_title_updated']);
    }

    public function test_owner_can_set_a_custom_title_and_clear_it(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $this->patchJson("/api/v1/teams/{$w['team']->id}/members/{$w['member']->id}", [
            'job_title' => 'DevOps Wizard',
        ])->assertOk();
        $this->assertDatabaseHas('users', ['id' => $w['member']->id, 'job_title' => 'DevOps Wizard']);

        $this->patchJson("/api/v1/teams/{$w['team']->id}/members/{$w['member']->id}", [
            'job_title' => null,
        ])->assertOk();
        $this->assertDatabaseHas('users', ['id' => $w['member']->id, 'job_title' => null]);
    }

    public function test_admin_can_set_titles(): void
    {
        $w = $this->world();
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/teams/{$w['team']->id}/members/{$w['member']->id}", [
            'job_title' => 'QA',
        ])->assertOk();

        $this->assertDatabaseHas('users', ['id' => $w['member']->id, 'job_title' => 'QA']);
    }

    public function test_plain_members_cannot_edit_titles_including_their_own(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['member']);

        // Someone else's title…
        $this->patchJson("/api/v1/teams/{$w['team']->id}/members/{$w['owner']->id}", [
            'job_title' => 'Developer',
        ])->assertForbidden();

        // …and their own.
        $this->patchJson("/api/v1/teams/{$w['team']->id}/members/{$w['member']->id}", [
            'job_title' => 'Developer',
        ])->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $w['member']->id, 'job_title' => null]);
    }

    public function test_title_for_a_non_member_is_404(): void
    {
        $w = $this->world();
        $stranger = User::factory()->create();
        Sanctum::actingAs($w['owner']);

        $this->patchJson("/api/v1/teams/{$w['team']->id}/members/{$stranger->id}", [
            'job_title' => 'Developer',
        ])
            ->assertNotFound()
            ->assertJsonPath('message', 'That user is not a member of this team.');
    }

    public function test_title_validates_length(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $this->patchJson("/api/v1/teams/{$w['team']->id}/members/{$w['member']->id}", [
            'job_title' => str_repeat('x', 101),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('job_title');
    }

    public function test_titles_are_visible_in_the_team_index(): void
    {
        $w = $this->world();
        $w['member']->forceFill(['job_title' => 'Accountant'])->save();
        Sanctum::actingAs($w['owner']);

        $members = collect($this->getJson('/api/v1/teams')->json('data.0.members'));

        $this->assertSame('Accountant', $members->firstWhere('id', $w['member']->id)['job_title']);
    }
}
