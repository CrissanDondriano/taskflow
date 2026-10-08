<?php

namespace Tests\Feature;

use App\Billing\FakeGateway;
use App\Billing\PaymentGateway;
use App\Models\Plan;
use App\Models\Project;
use App\Models\Team;
use App\Models\UsageCounter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Laravel\Cashier\Subscription;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    protected FakeGateway $gateway;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gateway = new FakeGateway;
        $this->app->instance(PaymentGateway::class, $this->gateway);
        Config::set('billing.pro.stripe_price_monthly', 'price_pro_m');
        Config::set('billing.pro.stripe_price_yearly', 'price_pro_y');
        Config::set('billing.team.stripe_price_monthly', 'price_team_m');
        Config::set('billing.team.stripe_price_yearly', 'price_team_y');
    }

    /**
     * @return array<string, mixed>
     */
    private function world(int $members = 1): array
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);
        for ($i = 1; $i < $members; $i++) {
            $team->members()->attach(User::factory()->create()->id, ['role_in_team' => 'member']);
        }

        return compact('owner', 'team');
    }

    private function activeSubscription(Team $team, string $price = 'price_pro_m'): void
    {
        Subscription::create([
            'user_id' => $team->owner_id,
            'team_id' => $team->id,
            'type' => 'default',
            'stripe_id' => 'sub_test_1',
            'stripe_status' => 'active',
            'stripe_price' => $price,
            'quantity' => 1,
        ]);
    }

    public function test_billing_overview_returns_free_plan_and_usage(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $this->getJson('/api/v1/billing')->assertOk()->assertJsonPath('data.plan.key', 'free')
            ->assertJsonPath('data.usage.members.used', 1)
            ->assertJsonPath('data.usage.members.limit', 3)
            ->assertJsonPath('data.subscription', null)
            ->assertJsonPath('data.can_manage', true)
            ->assertJsonPath('data.test_mode', true);
    }

    public function test_non_owner_cannot_manage_but_can_view(): void
    {
        $w = $this->world();
        $member = User::factory()->create();
        $w['team']->members()->attach($member->id, ['role_in_team' => 'member']);
        Sanctum::actingAs($member);

        $this->getJson('/api/v1/billing')->assertOk()->assertJsonPath('data.can_manage', false);
        $this->postJson('/api/v1/billing/checkout', ['plan' => 'pro', 'interval' => 'monthly'])->assertForbidden();
    }

    public function test_billing_disabled_returns_503(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);
        Config::set('billing.enabled', false);

        $this->getJson('/api/v1/billing')->assertServiceUnavailable();
        $this->postJson('/api/v1/billing/checkout', ['plan' => 'pro'])->assertServiceUnavailable();
    }

    public function test_checkout_validation_and_fake_redirect(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $this->postJson('/api/v1/billing/checkout', ['plan' => 'enterprise'])->assertUnprocessable();
        $this->postJson('/api/v1/billing/checkout', ['plan' => 'free'])->assertUnprocessable();
        $this->postJson('/api/v1/billing/checkout', ['plan' => 'pro', 'interval' => 'weekly'])->assertUnprocessable();

        $this->postJson('/api/v1/billing/checkout', ['plan' => 'pro', 'interval' => 'monthly'])
            ->assertOk()
            ->assertJsonPath('data.switched', false)
            ->assertJsonPath('data.url', 'https://checkout.stripe.test/session_'.$w['team']->id.'_pro_monthly');
    }

    public function test_checkout_swaps_or_refuses_when_subscribed(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);
        $this->activeSubscription($w['team'], 'price_pro_m');

        // Same plan + interval → refuse (no duplicate subscription).
        $this->postJson('/api/v1/billing/checkout', ['plan' => 'pro', 'interval' => 'monthly'])
            ->assertUnprocessable();

        // Different plan → in-place prorated swap, no Checkout redirect.
        $this->postJson('/api/v1/billing/checkout', ['plan' => 'team', 'interval' => 'monthly'])
            ->assertOk()
            ->assertJsonPath('data.switched', true)
            ->assertJsonPath('data.plan', 'team');
    }

    public function test_portal_cancel_and_invoices(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        $this->postJson('/api/v1/billing/portal')
            ->assertOk()
            ->assertJsonPath('data.url', 'https://billing.stripe.test/portal_'.$w['team']->id);

        // Nothing to cancel without a subscription.
        $this->postJson('/api/v1/billing/cancel')->assertUnprocessable();

        $this->activeSubscription($w['team']);
        $this->postJson('/api/v1/billing/cancel')->assertOk()->assertJsonStructure(['data' => ['ends_at']]);

        $this->getJson('/api/v1/billing/invoices')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'paid');
    }

    public function test_member_limit_blocks_invites_with_upgrade_payload(): void
    {
        // Free = 3 seats; owner + 2 members fills it.
        $w = $this->world(3);
        Sanctum::actingAs($w['owner']);

        $newcomer = User::factory()->create(['email' => 'fourth@example.test']);
        $this->postJson("/api/v1/teams/{$w['team']->id}/members", ['user_id' => $newcomer->id])
            ->assertStatus(402)
            ->assertJsonPath('upgrade_required', true)
            ->assertJsonPath('metric', 'members')
            ->assertJsonPath('used', 3)
            ->assertJsonPath('limit', 3);

        $this->assertDatabaseMissing('team_user', ['team_id' => $w['team']->id, 'user_id' => $newcomer->id]);
    }

    public function test_project_limit_blocks_creation(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        for ($i = 0; $i < 3; $i++) {
            Project::factory()->create(['team_id' => $w['team']->id, 'created_by' => $w['owner']->id]);
        }

        $this->postJson('/api/v1/projects', ['name' => 'Fourth', 'team_id' => $w['team']->id])
            ->assertStatus(402)
            ->assertJsonPath('metric', 'projects');
    }

    public function test_import_quota_blocks_uploads(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);
        UsageCounter::create([
            'team_id' => $w['team']->id, 'metric' => 'plan_imports',
            'period' => UsageCounter::period(), 'count' => 2,
        ]);

        $path = tempnam(sys_get_temp_dir(), 'plan').'.txt';
        file_put_contents($path, 'Work');
        $file = new UploadedFile($path, 'plan.txt', 'text/plain', null, true);

        $this->post("/api/v1/teams/{$w['team']->id}/plan-imports", ['file' => $file])
            ->assertStatus(402)
            ->assertJsonPath('upgrade_required', true);

        $this->assertDatabaseCount('plan_imports', 0);
    }

    public function test_ai_quota_blocks_and_counts_messages(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);

        UsageCounter::create([
            'team_id' => $w['team']->id, 'metric' => 'ai_messages',
            'period' => UsageCounter::period(), 'count' => 50,
        ]);
        $this->postJson('/api/v1/ai/ask', ['question' => 'Hello?'])
            ->assertStatus(402)
            ->assertJsonPath('metric', 'ai_messages');

        UsageCounter::query()->delete();
        Http::fake([
            'api.openai.com/*' => Http::response(['choices' => [['message' => ['content' => 'Do the thing.']]]], 200),
        ]);
        $this->postJson('/api/v1/ai/ask', ['question' => 'Hello?'])->assertOk();

        $this->assertSame(1, (int) UsageCounter::query()
            ->where('team_id', $w['team']->id)->where('metric', 'ai_messages')->value('count'));
    }

    public function test_unconfigured_gateway_returns_503(): void
    {
        $w = $this->world();
        Sanctum::actingAs($w['owner']);
        $this->gateway->configured = false;

        $this->postJson('/api/v1/billing/checkout', ['plan' => 'pro'])->assertServiceUnavailable();
    }

    public function test_free_plan_auto_provisions(): void
    {
        $this->assertSame('free', Plan::free()->key);
        $this->assertSame(3, Plan::free()->max_members);
    }
}
