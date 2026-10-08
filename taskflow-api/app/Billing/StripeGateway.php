<?php

namespace App\Billing;

use App\Models\Team;
use Laravel\Cashier\Cashier;
use RuntimeException;

/**
 * Stripe implementation (TEST MODE ONLY until live keys + price IDs are
 * configured). Uses Cashier's Billable checkout/portal builders on the
 * Team model; the webhook controller stays the source of truth for what
 * plan a team is actually on.
 */
class StripeGateway implements PaymentGateway
{
    public function isConfigured(): bool
    {
        return (string) config('cashier.secret', env('STRIPE_SECRET')) !== '';
    }

    public function isTestMode(): bool
    {
        return str_starts_with((string) config('cashier.key', env('STRIPE_KEY')), 'pk_test_');
    }

    protected function priceFor(string $plan, string $interval): string
    {
        $price = config("billing.{$plan}.stripe_price_{$interval}");
        if (! $price) {
            throw new RuntimeException(
                "No Stripe price configured for the {$plan} plan ({$interval}). Run php artisan billing:sync-plans and set the price IDs in .env."
            );
        }

        return $price;
    }

    protected function ensureCustomer(Team $team): void
    {
        if ($team->hasStripeId()) {
            return;
        }

        $owner = $team->owner;
        $team->createAsStripeCustomer([
            'name' => $team->name,
            'email' => $owner?->email,
            'metadata' => ['team_id' => $team->id],
        ]);
    }

    public function createCheckoutSession(Team $team, string $plan, string $interval, string $successUrl, string $cancelUrl): array
    {
        $this->requireConfigured();
        $price = $this->priceFor($plan, $interval);

        $checkout = $team->newSubscription('default', $price)->checkout([
            'success_url' => $successUrl.'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => $cancelUrl,
            'metadata' => ['team_id' => $team->id, 'plan' => $plan, 'interval' => $interval],
            'subscription_data' => ['metadata' => ['team_id' => $team->id, 'plan' => $plan, 'interval' => $interval]],
        ]);

        return ['url' => $checkout->asStripeCheckoutSession()->url];
    }

    public function swapSubscription(Team $team, string $plan, string $interval): array
    {
        $this->requireConfigured();
        $price = $this->priceFor($plan, $interval);

        $subscription = $team->subscription('default');
        if (! $subscription) {
            throw new RuntimeException('No active subscription to change — check out a plan first.');
        }

        $swapped = $subscription->swap($price);

        return [
            'plan' => $plan,
            'interval' => $interval,
            'status' => $swapped->stripe_status,
        ];
    }

    public function createPortalSession(Team $team, string $returnUrl): array
    {
        $this->requireConfigured();
        $this->ensureCustomer($team);

        $session = Cashier::stripe()->billingPortal->sessions->create([
            'customer' => $team->stripe_id,
            'return_url' => $returnUrl,
        ]);

        return ['url' => $session->url];
    }

    public function cancelSubscription(Team $team): ?string
    {
        $this->requireConfigured();

        $subscription = $team->subscription('default');
        if (! $subscription || $subscription->canceled() || $subscription->ended()) {
            return null;
        }

        $canceled = $subscription->cancel();

        return $canceled->ends_at?->toISOString();
    }

    public function invoices(Team $team): array
    {
        if (! $team->hasStripeId()) {
            return [];
        }

        return collect($team->invoices())->map(fn ($invoice) => [
            'id' => $invoice->id,
            'amount' => $invoice->total(),
            'currency' => strtoupper($invoice->currency ?? 'USD'),
            'status' => $invoice->status,
            'date' => $invoice->created ? gmdate('Y-m-d', $invoice->created) : null,
            'url' => $invoice->hosted_invoice_url,
        ])->values()->all();
    }

    protected function requireConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Billing is not configured — set STRIPE_KEY and STRIPE_SECRET in .env.');
        }
    }
}
