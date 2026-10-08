<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Laravel\Cashier\Subscription;
use Tests\TestCase;

class StripeWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected string $secret = 'whsec_test_123';

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('billing.webhook_secret', $this->secret);
        Config::set('billing.pro.stripe_price_monthly', 'price_pro_m');
        Config::set('billing.team.stripe_price_monthly', 'price_team_m');
    }

    private function team(): Team
    {
        $owner = User::factory()->create();
        $team = Team::factory()->create(['owner_id' => $owner->id]);
        $team->members()->attach($owner->id, ['role_in_team' => 'lead']);

        return $team;
    }

    private function postEvent(string $type, string $id, array $object)
    {
        $payload = json_encode(['id' => $id, 'type' => $type, 'data' => ['object' => $object]]);
        $t = time();
        $sig = hash_hmac('sha256', "{$t}.{$payload}", $this->secret);

        return $this->call('POST', '/api/v1/webhooks/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$t},v1={$sig}",
        ], $payload);
    }

    private function subscriptionObject(Team $team, array $overrides = []): array
    {
        return array_merge([
            'id' => 'sub_123',
            'customer' => 'cus_123',
            'status' => 'active',
            'metadata' => ['team_id' => $team->id],
            'items' => ['data' => [['price' => ['id' => 'price_pro_m'], 'quantity' => 1]]],
        ], $overrides);
    }

    public function test_bad_signature_is_rejected(): void
    {
        $response = $this->call('POST', '/api/v1/webhooks/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => 't=123,v1=deadbeef',
        ], json_encode(['id' => 'evt_x', 'type' => 'ping']));

        $response->assertStatus(400);
        $this->assertDatabaseCount('webhook_events', 0);
    }

    public function test_subscription_created_flips_the_plan_and_is_idempotent(): void
    {
        $team = $this->team();

        $this->postEvent('customer.subscription.created', 'evt_1', $this->subscriptionObject($team))
            ->assertOk()->assertJsonPath('received', true);

        $this->assertSame('pro', $team->fresh()->resolvePlan()->key);
        $this->assertDatabaseHas('subscriptions', ['stripe_id' => 'sub_123', 'stripe_status' => 'active']);

        // Redelivery of the same event id is a no-op (single subscription row).
        $this->postEvent('customer.subscription.created', 'evt_1', $this->subscriptionObject($team))
            ->assertOk()->assertJsonPath('duplicate', true);

        $this->assertSame(1, Subscription::where('stripe_id', 'sub_123')->count());
        $this->assertSame('pro', $team->fresh()->resolvePlan()->key);
    }

    public function test_subscription_deleted_returns_the_team_to_free(): void
    {
        $team = $this->team();
        $team->forceFill(['plan_id' => Plan::resolve('pro')->id])->save();

        $this->postEvent(
            'customer.subscription.deleted',
            'evt_del',
            $this->subscriptionObject($team, ['status' => 'canceled'])
        )->assertOk();

        $this->assertSame('free', $team->fresh()->resolvePlan()->key);
    }

    public function test_payment_failed_flags_past_due_without_yanking_the_plan(): void
    {
        $team = $this->team();
        $team->forceFill(['plan_id' => Plan::resolve('pro')->id, 'stripe_id' => 'cus_123'])->save();
        Subscription::create([
            'user_id' => $team->owner_id,
            'team_id' => $team->id,
            'type' => 'default',
            'stripe_id' => 'sub_123',
            'stripe_status' => 'active',
            'stripe_price' => 'price_pro_m',
            'quantity' => 1,
        ]);

        $this->postEvent('invoice.payment_failed', 'evt_fail', [
            'id' => 'in_1',
            'customer' => 'cus_123',
        ])->assertOk();

        $this->assertSame('past_due', Subscription::where('stripe_id', 'sub_123')->value('stripe_status'));
        // Grace: the plan stays until the subscription itself ends.
        $this->assertSame('pro', $team->fresh()->resolvePlan()->key);
    }

    public function test_checkout_completed_links_the_customer(): void
    {
        $team = $this->team();

        $this->postEvent('checkout.session.completed', 'evt_co', [
            'id' => 'cs_1',
            'customer' => 'cus_new',
            'metadata' => ['team_id' => $team->id, 'plan' => 'pro', 'interval' => 'monthly'],
        ])->assertOk();

        $this->assertSame('cus_new', $team->fresh()->stripe_id);
        // Plan itself flips on the subscription events that follow.
        $this->assertSame('free', $team->fresh()->resolvePlan()->key);
    }

    public function test_unknown_event_type_acks_without_drama(): void
    {
        $this->postEvent('customer.created', 'evt_unknown', ['id' => 'cus_x'])->assertOk();

        $this->assertDatabaseHas('webhook_events', ['id' => 'evt_unknown', 'type' => 'customer.created']);
    }
}
