<?php

namespace App\Billing;

use App\Models\Plan;
use App\Models\Team;
use App\Models\WebhookEvent;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Subscription;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook as StripeWebhook;

/**
 * POST /api/webhooks/stripe — public, signature-verified, idempotent.
 * This controller (not the frontend redirect) is the source of truth for
 * what plan a team is on: subscription events upsert Cashier's
 * subscriptions rows and sync Team::plan_id; unknown/duplicate deliveries
 * ack 200 so Stripe stops retrying them.
 */
class StripeWebhookController
{
    /**
     * Statuses that keep the paid plan (past_due warns in the UI instead of
     * yanking access mid-cycle) vs ones that drop the team to Free.
     */
    protected const PAID_STATUSES = ['active', 'trialing', 'past_due'];

    public function handle(Request $request)
    {
        $secret = (string) config('billing.webhook_secret');
        if ($secret === '') {
            return response()->json(['message' => 'Stripe webhooks are not configured.'], 503);
        }

        try {
            $event = StripeWebhook::constructEvent(
                $request->getContent(),
                (string) $request->header('Stripe-Signature', ''),
                $secret
            );
        } catch (\UnexpectedValueException|SignatureVerificationException $e) {
            Log::warning('Stripe webhook rejected: bad signature.');

            return response()->json(['message' => 'Invalid signature.'], 400);
        }

        // Idempotency first: the event id is the primary key, so a racing
        // redelivery hits the unique constraint and is acked as a duplicate.
        try {
            $record = WebhookEvent::create(['id' => $event->id, 'type' => $event->type]);
        } catch (QueryException) {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        $teamId = null;
        try {
            $teamId = match ($event->type) {
                'checkout.session.completed' => $this->onCheckoutCompleted($event->data->object),
                'customer.subscription.created', 'customer.subscription.updated' => $this->onSubscriptionUpsert($event->data->object),
                'customer.subscription.deleted' => $this->onSubscriptionDeleted($event->data->object),
                'invoice.paid' => $this->onInvoicePaid($event->data->object),
                'invoice.payment_failed' => $this->onInvoiceFailed($event->data->object),
                default => $this->onIgnored($event->type),
            };
        } catch (\Throwable $e) {
            Log::error('Stripe webhook handler failed.', [
                'event_id' => $event->id, 'type' => $event->type, 'message' => $e->getMessage(),
            ]);

            // 500 → Stripe retries, and the PK guard above makes the retry safe.
            return response()->json(['message' => 'Handler failed, will retry.'], 500);
        }

        $record->update(['team_id' => $teamId, 'processed_at' => now()]);

        return response()->json(['received' => true]);
    }

    /**
     * Link the Stripe customer to the team. Plan flips happen on the
     * subscription events that follow seconds later (single source).
     */
    protected function onCheckoutCompleted(object $session): ?int
    {
        $teamId = (int) ($session->metadata->team_id ?? 0);
        $team = $teamId ? Team::find($teamId) : null;
        if (! $team) {
            Log::warning('Stripe checkout completed for an unknown team.', ['team_id' => $teamId]);

            return null;
        }

        if (! $team->hasStripeId() && isset($session->customer)) {
            $team->forceFill(['stripe_id' => (string) $session->customer])->save();
        }

        return $team->id;
    }

    protected function onSubscriptionUpsert(object $subscription): ?int
    {
        $team = $this->teamForSubscription($subscription);
        if (! $team) {
            return null;
        }

        $this->syncSubscriptionRow($team, $subscription);

        $mapped = Plan::fromStripePrice($subscription->items->data[0]->price->id ?? null);
        if ($mapped) {
            [$planKey] = $mapped;
            $this->setPlan($team, $planKey, in_array($subscription->status, self::PAID_STATUSES, true));
        } else {
            Log::warning('Stripe subscription with unmapped price.', ['subscription' => $subscription->id]);
        }

        return $team->id;
    }

    protected function onSubscriptionDeleted(object $subscription): ?int
    {
        $team = $this->teamForSubscription($subscription);
        if (! $team) {
            return null;
        }

        $this->syncSubscriptionRow($team, $subscription, true);
        $team->forceFill(['plan_id' => Plan::free()->id])->save();
        Log::info('Billing: team subscription ended, back to Free.', ['team_id' => $team->id]);

        return $team->id;
    }

    protected function onInvoicePaid(object $invoice): ?int
    {
        // Reconcile from the invoice's own lines (covers retries and manual
        // payments that arrive without a fresh subscription event).
        $priceId = $invoice->lines->data[0]->price->id ?? null;
        $mapped = Plan::fromStripePrice($priceId);
        $team = $this->teamForCustomer($invoice->customer ?? null);
        if (! $team || ! $mapped) {
            return $team?->id;
        }

        [$planKey] = $mapped;
        $this->setPlan($team, $planKey, true);

        return $team->id;
    }

    protected function onInvoiceFailed(object $invoice): ?int
    {
        $team = $this->teamForCustomer($invoice->customer ?? null);
        if (! $team) {
            return null;
        }

        // Keep the plan (grace) but surface past_due so the billing page can
        // show the "payment failed" state with an update-card path to portal.
        $subscription = $team->subscription('default');
        if ($subscription) {
            $subscription->forceFill(['stripe_status' => 'past_due'])->save();
        }
        Log::warning('Billing: invoice payment failed.', ['team_id' => $team->id, 'invoice' => $invoice->id ?? null]);

        return $team->id;
    }

    protected function onIgnored(string $type): ?int
    {
        Log::info('Stripe webhook ignored (no handler).', ['type' => $type]);

        return null;
    }

    protected function teamForSubscription(object $subscription): ?Team
    {
        $teamId = (int) ($subscription->metadata->team_id ?? 0);
        if ($teamId && ($team = Team::find($teamId))) {
            return $team;
        }

        return $this->teamForCustomer($subscription->customer ?? null);
    }

    protected function teamForCustomer(mixed $customerId): ?Team
    {
        if (! $customerId) {
            return null;
        }

        return Team::where('stripe_id', (string) $customerId)->first();
    }

    protected function syncSubscriptionRow(Team $team, object $subscription, bool $deleted = false): void
    {
        $endsAt = $subscription->ended_at ?? $subscription->cancel_at ?? null;
        if (! $endsAt && ($subscription->cancel_at_period_end ?? false)) {
            $endsAt = $subscription->current_period_end ?? null;
        }

        Subscription::updateOrCreate(
            ['stripe_id' => $subscription->id],
            [
                'user_id' => $team->owner_id,
                'team_id' => $team->id,
                'type' => 'default',
                'stripe_status' => $deleted ? 'canceled' : (string) ($subscription->status ?? 'incomplete'),
                'stripe_price' => $subscription->items->data[0]->price->id ?? null,
                'quantity' => $subscription->items->data[0]->quantity ?? 1,
                'trial_ends_at' => isset($subscription->trial_end) ? gmdate('Y-m-d H:i:s', $subscription->trial_end) : null,
                'ends_at' => $endsAt ? gmdate('Y-m-d H:i:s', $endsAt) : null,
            ]
        );
    }

    protected function setPlan(Team $team, string $planKey, bool $paid): void
    {
        $team->forceFill(['plan_id' => Plan::resolve($paid ? $planKey : 'free')->id])->save();
    }
}
