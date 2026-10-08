<?php

namespace App\Billing;

use App\Models\Plan;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Team billing: current plan, monthly usage vs limits, subscription state,
 * checkout/portal/cancel. The SPA's workspace is the user's first team —
 * the same "one implicit team" convention as the rest of the app.
 */
class BillingController
{
    public function __construct(protected PaymentGateway $gateway) {}

    protected function ensureEnabled(): void
    {
        if (! config('billing.enabled', true)) {
            abort(503, 'Billing is currently disabled.');
        }
    }

    protected function teamFor(User $user): ?Team
    {
        return $user->ownedTeams()->first() ?? $user->teams()->first();
    }

    /**
     * GET /api/v1/billing
     */
    public function show(Request $request)
    {
        $this->ensureEnabled();

        $team = $this->teamFor($request->user());
        if (! $team) {
            return response()->json(['data' => [
                'team_id' => null,
                'plan' => $this->planShape(Plan::free()),
                'test_mode' => $this->gateway->isTestMode(),
                'subscription' => null,
                'usage' => [],
                'can_manage' => false,
            ]]);
        }

        $limits = EnforcePlanLimits::for($team);
        $subscription = $team->subscription('default');

        return response()->json(['data' => [
            'team_id' => $team->id,
            'team_name' => $team->name,
            'plan' => $this->planShape($team->resolvePlan()),
            'test_mode' => $this->gateway->isTestMode(),
            'subscription' => $subscription ? [
                'status' => $subscription->stripe_status,
                'stripe_price' => $subscription->stripe_price,
                'ends_at' => $subscription->ends_at?->toISOString(),
                'on_grace_period' => (bool) $subscription->onGracePeriod(),
            ] : null,
            'usage' => $limits->snapshot(),
            'can_manage' => $request->user()->isAdmin() || $team->owner_id === $request->user()->id,
        ]]);
    }

    /**
     * POST /api/v1/billing/checkout {plan: pro|team, interval: monthly|yearly}
     * New subscribers get a Checkout URL; teams already subscribed get an
     * in-place prorated swap instead of a second subscription.
     */
    public function checkout(Request $request)
    {
        $this->ensureEnabled();

        $data = $request->validate([
            'plan' => ['required', 'in:pro,team'],
            'interval' => ['sometimes', 'in:monthly,yearly'],
        ]);
        $interval = $data['interval'] ?? 'monthly';

        $team = $this->teamFor($request->user());
        if (! $team) {
            return response()->json(['message' => 'Join or create a team before choosing a plan.'], 422);
        }
        $this->ensureManager($request, $team);
        $this->ensureConfigured();

        try {
            $active = $team->subscription('default');
            if ($active && $active->active() && ! $active->onGracePeriod()) {
                $current = Plan::fromStripePrice($active->stripe_price);
                if ($current && $current[0] === $data['plan'] && $current[1] === $interval) {
                    return response()->json(['message' => "You're already on that plan."], 422);
                }
                $swapped = $this->gateway->swapSubscription($team, $data['plan'], $interval);

                return response()->json(['data' => [
                    'switched' => true,
                    'plan' => $swapped['plan'],
                    'interval' => $swapped['interval'],
                    'status' => $swapped['status'],
                ]]);
            }

            $frontend = rtrim((string) config('app.frontend_url', ''), '/');

            return response()->json(['data' => array_merge(
                ['switched' => false],
                $this->gateway->createCheckoutSession(
                    $team,
                    $data['plan'],
                    $interval,
                    $frontend.'/billing/success',
                    $frontend.'/billing/cancel'
                )
            )]);
        } catch (\RuntimeException $e) {
            Log::warning('Billing checkout failed.', ['team_id' => $team->id, 'message' => $e->getMessage()]);

            return response()->json(['message' => $e->getMessage()], 503);
        }
    }

    /**
     * POST /api/v1/billing/portal — Customer Portal (manage/cancel).
     */
    public function portal(Request $request)
    {
        $this->ensureEnabled();

        $team = $this->teamFor($request->user());
        if (! $team) {
            return response()->json(['message' => 'No team to manage billing for.'], 422);
        }
        $this->ensureManager($request, $team);
        $this->ensureConfigured();

        try {
            $frontend = rtrim((string) config('app.frontend_url', ''), '/');

            return response()->json(['data' => $this->gateway->createPortalSession($team, $frontend.'/dashboard/billing')]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 503);
        }
    }

    /**
     * POST /api/v1/billing/cancel — cancel at period end (downgrade path).
     */
    public function cancel(Request $request)
    {
        $this->ensureEnabled();

        $team = $this->teamFor($request->user());
        if (! $team) {
            return response()->json(['message' => 'No subscription to cancel.'], 422);
        }
        $this->ensureManager($request, $team);
        $this->ensureConfigured();

        $endsAt = $this->gateway->cancelSubscription($team);
        if ($endsAt === null) {
            return response()->json(['message' => 'There is no active subscription to cancel.'], 422);
        }

        return response()->json(['data' => [
            'message' => 'Subscription cancels at the end of the billing period.',
            'ends_at' => $endsAt,
        ]]);
    }

    /**
     * GET /api/v1/billing/invoices
     */
    public function invoices(Request $request)
    {
        $this->ensureEnabled();

        $team = $this->teamFor($request->user());
        if (! $team) {
            return response()->json(['data' => []]);
        }
        $this->ensureManager($request, $team);

        return response()->json(['data' => $this->gateway->invoices($team)]);
    }

    protected function ensureManager(Request $request, Team $team): void
    {
        if (! $request->user()->isAdmin() && $team->owner_id !== $request->user()->id) {
            abort(403, 'Only the team owner can manage billing.');
        }
    }

    protected function ensureConfigured(): void
    {
        if (! $this->gateway->isConfigured()) {
            abort(503, 'Billing is not configured — set STRIPE_KEY and STRIPE_SECRET in .env.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function planShape(Plan $plan): array
    {
        return [
            'key' => $plan->key,
            'name' => $plan->name,
            'limits' => [
                'members' => $plan->max_members,
                'projects' => $plan->max_projects,
                'plan_imports' => $plan->max_imports_monthly,
                'ai_messages' => $plan->max_ai_messages_monthly,
            ],
        ];
    }
}
