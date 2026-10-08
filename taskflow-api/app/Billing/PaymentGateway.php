<?php

namespace App\Billing;

use App\Models\Team;

/**
 * Payment provider behind an interface so Stripe (test mode today) can be
 * swapped for PayMongo later without touching controllers. All money talk
 * goes through here; webhooks stay in StripeWebhookController.
 */
interface PaymentGateway
{
    /**
     * Start a subscription Checkout Session for a paid plan.
     *
     * @return array{url: string}
     */
    public function createCheckoutSession(Team $team, string $plan, string $interval, string $successUrl, string $cancelUrl): array;

    /**
     * Swap the team's active subscription to another price (upgrade /
     * downgrade, prorated by Stripe). Returns the new plan + interval.
     *
     * @return array{plan: string, interval: string, status: string}
     */
    public function swapSubscription(Team $team, string $plan, string $interval): array;

    /** Customer Portal session for managing/canceling. @return array{url: string} */
    public function createPortalSession(Team $team, string $returnUrl): array;

    /** Cancel at period end. Returns the access end date (ISO) or null. */
    public function cancelSubscription(Team $team): ?string;

    /** Invoice history for the billing page. @return array<int, array<string, mixed>> */
    public function invoices(Team $team): array;

    public function isConfigured(): bool;

    public function isTestMode(): bool;
}
