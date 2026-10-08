<?php

namespace App\Billing;

use App\Models\Team;

/**
 * In-test stand-in for Stripe: no network, deterministic URLs, records
 * calls so tests can assert the controller asked for the right thing.
 * Bound in tests via app()->instance(PaymentGateway::class, new FakeGateway).
 */
class FakeGateway implements PaymentGateway
{
    /** @var array<int, array<string, mixed>> */
    public array $calls = [];

    public bool $configured = true;

    public bool $testMode = true;

    public function isConfigured(): bool
    {
        return $this->configured;
    }

    public function isTestMode(): bool
    {
        return $this->testMode;
    }

    public function createCheckoutSession(Team $team, string $plan, string $interval, string $successUrl, string $cancelUrl): array
    {
        $this->calls[] = ['checkout', $team->id, $plan, $interval];

        return ['url' => "https://checkout.stripe.test/session_{$team->id}_{$plan}_{$interval}"];
    }

    public function swapSubscription(Team $team, string $plan, string $interval): array
    {
        $this->calls[] = ['swap', $team->id, $plan, $interval];

        return ['plan' => $plan, 'interval' => $interval, 'status' => 'active'];
    }

    public function createPortalSession(Team $team, string $returnUrl): array
    {
        $this->calls[] = ['portal', $team->id];

        return ['url' => "https://billing.stripe.test/portal_{$team->id}"];
    }

    public function cancelSubscription(Team $team): ?string
    {
        $this->calls[] = ['cancel', $team->id];

        // Mirror the real gateway: nothing to cancel without an active sub.
        $subscription = $team->subscription('default');
        if (! $subscription || $subscription->canceled() || $subscription->ended()) {
            return null;
        }

        return now()->addMonth()->toISOString();
    }

    public function invoices(Team $team): array
    {
        return [[
            'id' => 'in_test_1',
            'amount' => 1400,
            'currency' => 'USD',
            'status' => 'paid',
            'date' => now()->toDateString(),
            'url' => 'https://invoice.stripe.test/in_test_1',
        ]];
    }
}
