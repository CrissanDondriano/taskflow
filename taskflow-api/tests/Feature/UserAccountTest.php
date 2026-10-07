<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * PATCH /me (profile edits) and DELETE /me (account deletion). Deletion is
 * password-confirmed and must hand shared work — owned teams, projects,
 * tasks, integrations — to surviving members instead of cascading it away,
 * while removing everything personal (tokens, sessions, notifications,
 * reset links) and preserving the audit trail.
 */
class UserAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_endpoints_require_authentication(): void
    {
        $this->patchJson('/api/v1/me')->assertUnauthorized();
        $this->deleteJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_profile_can_be_updated(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me', [
            'name' => 'New Name',
            'email' => 'new@example.test',
        ])
            ->assertOk()
            ->assertJsonPath('name', 'New Name')
            ->assertJsonPath('email', 'new@example.test')
            ->assertJsonPath('id', $user->id);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'New Name']);
        $this->assertDatabaseHas('audit_logs', ['user_id' => $user->id, 'action' => 'auth.profile_updated']);
    }

    public function test_profile_update_rejects_another_users_email(): void
    {
        $user = User::factory()->create();
        $taken = User::factory()->create(['email' => 'taken@example.test']);
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me', ['name' => $user->name, 'email' => $taken->email])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_profile_update_requires_name(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->patchJson('/api/v1/me', ['email' => 'someone@example.test'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_profile_update_retires_stale_reset_links(): void
    {
        $user = User::factory()->create(['email' => 'old@example.test']);
        DB::table('password_reset_tokens')->insert([
            'email' => 'old@example.test',
            'token' => 'hashed-token',
            'created_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me', ['name' => $user->name, 'email' => 'brand-new@example.test'])->assertOk();

        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'old@example.test']);
    }

    public function test_account_deletion_requires_the_current_password(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->deleteJson('/api/v1/me')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->deleteJson('/api/v1/me', ['password' => 'not-my-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    public function test_account_can_be_deleted_and_its_token_revoked(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('taskflow')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/me')->assertOk();

        $this->withToken($token)
            ->deleteJson('/api/v1/me', ['password' => 'password'])
            ->assertOk()
            ->assertJsonPath('message', 'Account deleted.');

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);

        // RequestGuard caches the resolved user across requests made within
        // one test method — flush it so the final request re-authenticates
        // from the (now deleted) token, exactly like a fresh browser would.
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_deletion_transfers_owned_team_and_work_to_a_surviving_member(): void
    {
        $owner = User::factory()->create();
        $mate = User::factory()->create(['role' => 'manager']);

        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        $team->members()->attach($mate->id, ['role_in_team' => 'member']);

        $project = Project::factory()->create(['team_id' => $team->id, 'created_by' => $owner->id]);
        $ownedTask = Task::factory()->create([
            'project_id' => $project->id,
            'created_by' => $owner->id,
            'assignee_id' => $mate->id,
        ]);
        $mateTask = Task::factory()->create(['project_id' => $project->id, 'created_by' => $mate->id]);

        Sanctum::actingAs($owner);
        $this->deleteJson('/api/v1/me', ['password' => 'password'])->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $owner->id]);

        // The team survives under the remaining member, and so does the
        // shared work both of them were using.
        $this->assertSame($mate->id, (int) $team->fresh()->owner_id);
        $this->assertSame($mate->id, (int) $project->fresh()->created_by);
        $this->assertSame($mate->id, (int) $ownedTask->fresh()->created_by);
        $this->assertDatabaseHas('tasks', ['id' => $ownedTask->id, 'assignee_id' => $mate->id]);
        $this->assertDatabaseHas('tasks', ['id' => $mateTask->id]);
        $this->assertDatabaseHas('team_user', ['team_id' => $team->id, 'user_id' => $mate->id]);
    }

    public function test_deletion_removes_a_sole_owners_team_with_them(): void
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        $project = Project::factory()->create(['team_id' => $team->id, 'created_by' => $owner->id]);
        $task = Task::factory()->create(['project_id' => $project->id, 'created_by' => $owner->id]);

        Sanctum::actingAs($owner);
        $this->deleteJson('/api/v1/me', ['password' => 'password'])->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $owner->id]);
        $this->assertDatabaseMissing('teams', ['id' => $team->id]);
        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }

    public function test_deletion_cleans_personal_residue_but_keeps_the_audit_trail(): void
    {
        $user = User::factory()->create();
        $user->createToken('taskflow');

        DB::table('sessions')->insert([
            'id' => Str::random(40),
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'test',
            'payload' => base64_encode('[]'),
            'last_activity' => time(),
        ]);
        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\TaskAtRiskNotification',
            'data' => json_encode(['title' => 'x']),
            'notifiable_type' => $user->getMorphClass(),
            'notifiable_id' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('password_reset_tokens')->insert([
            'email' => $user->email,
            'token' => 'hashed-token',
            'created_at' => now(),
        ]);

        Sanctum::actingAs($user);
        $this->deleteJson('/api/v1/me', ['password' => 'password'])->assertOk();

        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('notifications', ['notifiable_id' => $user->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $user->email]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);

        // The audit row outlives the account, with the FK nulled.
        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.account_deleted', 'user_id' => null]);
    }
}
