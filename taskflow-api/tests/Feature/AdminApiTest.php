<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_admin_endpoints(): void
    {
        $this->getJson('/api/v1/admin/users')->assertUnauthorized();
        $this->getJson('/api/v1/admin/stats')->assertUnauthorized();
        $this->getJson('/api/v1/admin/audit-logs')->assertUnauthorized();
    }

    public function test_non_admin_gets_403(): void
    {
        $member = User::factory()->create(['role' => 'member']);
        Sanctum::actingAs($member);

        $this->getJson('/api/v1/admin/users')->assertForbidden();
        $this->patchJson("/api/v1/admin/users/{$member->id}/role", ['role' => 'manager'])
            ->assertForbidden();
    }

    public function test_admin_stats_returns_platform_counts(): void
    {
        User::factory()->count(2)->create();
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/stats')
            ->assertOk()
            ->assertJsonStructure([
                'users',
                'teams',
                'projects',
                'tasks',
                'audit_events',
                'ai' => ['insights', 'configured', 'model'],
            ])
            ->assertJsonPath('users', 3);
    }

    public function test_admin_lists_users_paginated(): void
    {
        User::factory()->count(3)->create();
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'name', 'email', 'role', 'assigned_tasks_count', 'created_at']],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'per_page', 'total'],
            ]);

        $this->assertCount(4, $response->json('data'));
        $this->assertSame(4, $response->json('meta.total'));
    }

    public function test_admin_changes_a_users_role_and_it_is_audited(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create(['role' => 'member']);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/users/{$member->id}/role", ['role' => 'manager'])
            ->assertOk()
            ->assertJsonPath('role', 'manager');

        $this->assertSame('manager', $member->fresh()->role);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.role_changed',
            'user_id' => $admin->id,
            'auditable_id' => $member->id,
        ]);
    }

    public function test_role_change_rejects_unknown_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create(['role' => 'member']);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/users/{$member->id}/role", ['role' => 'superuser'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role']);

        $this->assertSame('member', $member->fresh()->role);
    }

    public function test_last_admin_cannot_be_demoted(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/v1/admin/users/{$admin->id}/role", ['role' => 'member'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Cannot demote the last admin.');

        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_admin_can_demote_themselves_when_another_admin_exists(): void
    {
        $first = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($first);

        $this->patchJson("/api/v1/admin/users/{$first->id}/role", ['role' => 'member'])
            ->assertOk()
            ->assertJsonPath('role', 'member');

        $this->assertSame('member', $first->fresh()->role);
    }

    public function test_register_ignores_client_supplied_role(): void
    {
        $this->postJson('/api/v1/register', [
            'name' => 'Escalator',
            'email' => 'escalator@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'escalator@example.com',
            'role' => 'member',
        ]);
    }

    public function test_login_writes_an_audit_log_entry(): void
    {
        $user = User::factory()->create(['password' => 'password123']);

        $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'auth.login',
            'user_id' => $user->id,
        ]);
    }

    public function test_audit_logs_endpoint_returns_recent_events(): void
    {
        $user = User::factory()->create(['password' => 'password123']);
        $this->postJson('/api/v1/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/audit-logs')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'action', 'user', 'metadata', 'ip_address', 'created_at']],
                'meta' => ['current_page', 'per_page', 'total'],
            ]);
    }
}
