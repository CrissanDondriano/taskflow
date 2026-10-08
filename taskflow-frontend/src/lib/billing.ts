import { api, ApiError } from "./api";

/**
 * Billing helpers: plan catalog (mirrors config/billing.php — keep the
 * prices in sync by hand), usage formatting, and the checkout starter the
 * Pricing page and billing page share.
 */

export type BillingInterval = "monthly" | "yearly";

export interface PlanLimits {
  members: number | null;
  projects: number | null;
  plan_imports: number | null;
  ai_messages: number | null;
}

export interface UsageEntry {
  used: number;
  limit: number | null;
}

export type UsageMetric = "members" | "projects" | "plan_imports" | "ai_messages";

export interface BillingInfo {
  team_id: number | null;
  team_name?: string;
  plan: { key: string; name: string; limits: PlanLimits };
  test_mode: boolean;
  subscription: {
    status: string;
    stripe_price: string | null;
    ends_at: string | null;
    on_grace_period: boolean;
  } | null;
  usage: Record<UsageMetric, UsageEntry>;
  can_manage: boolean;
}

export const METRIC_LABELS: Record<UsageMetric, string> = {
  members: "Team members",
  projects: "Projects",
  plan_imports: "Plan imports / month",
  ai_messages: "AI messages / month",
};

export interface PaidPlan {
  key: "pro" | "team";
  name: string;
  monthly: number;
  yearlyTotal: number;
  blurb: string;
}

export const PAID_PLANS: PaidPlan[] = [
  { key: "pro", name: "Pro", monthly: 14, yearlyTotal: 134.4, blurb: "For teams that ship every week." },
  { key: "team", name: "Team", monthly: 29, yearlyTotal: 278.4, blurb: "For organizations with security needs." },
];

/** $14.00 → "$14", $11.20 → "$11.20" (yearly per-month equivalents). */
export function formatUsd(amount: number): string {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/** 0–100 for progress bars; null when unlimited (bar renders full). */
export function usagePercent(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : String(limit);
}

/**
 * Starts a Stripe Checkout (or an in-place swap when already subscribed)
 * and redirects the browser to it. Throws ApiError for the caller to show —
 * including the 402 upgrade payload, which callers usually don't hit here.
 */
export async function startCheckout(plan: "pro" | "team", interval: BillingInterval): Promise<void> {
  const res = await api.post<{ url?: string; switched?: boolean }>(`/billing/checkout`, {
    plan,
    interval,
  });
  if (res.switched) {
    return; // In-place plan change — the caller refreshes billing state.
  }
  if (!res.url) {
    throw new ApiError("Checkout didn't return a payment link.", 500);
  }
  window.location.href = res.url;
}

/** True for quota errors the UI should answer with an upgrade prompt. */
export function isUpgradeRequired(err: unknown): boolean {
  return err instanceof ApiError && err.status === 402;
}
