import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CreditCard, FlaskConical, Receipt, ShieldCheck, X } from "lucide-react";
import { GlassPanel, EmptyState, ConfirmDialog } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { useCanManageTeam } from "../../context/TeamContext";
import { api, ApiError } from "../../lib/api";
import {
  type BillingInfo,
  type BillingInterval,
  type UsageMetric,
  METRIC_LABELS,
  PAID_PLANS,
  formatLimit,
  formatUsd,
  startCheckout,
  usagePercent,
} from "../../lib/billing";
import { useToast } from "../../context/ToastContext";

const INTERVALS: BillingInterval[] = ["monthly", "yearly"];

/** Usage cards shown in the "Usage this month" row, in comp order. */
const USAGE_METRICS: UsageMetric[] = ["members", "ai_messages", "plan_imports", "projects"];

const USAGE_LABEL: Record<UsageMetric, string> = {
  members: "Team members",
  ai_messages: "AI actions",
  plan_imports: "PDF imports",
  projects: "Projects",
};

interface InvoiceRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string | null;
  url: string | null;
}

/** "2026-11-30T…" / "2026-11-30" → "Nov 30, 2026"; null when unparseable. */
function formatLongDate(value: string | null): string | null {
  if (!value) return null;
  const iso = value.slice(0, 10);
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Team billing: current plan, monthly usage vs limits, upgrade/downgrade
 * (Stripe Checkout or in-place swap), Customer Portal, cancel-at-period-end
 * and the invoice list. Only owners/admins can change anything — everyone
 * else gets a read-only notice.
 */
export function BillingPage() {
  const canManage = useCanManageTeam();
  const { toast } = useToast();
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [showPlans, setShowPlans] = useState(false);
  const plansRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: BillingInfo }>("/billing");
      setInfo(res.data);
      if (res.data.team_id !== null) {
        const inv = await api.get<{ data: InvoiceRow[] }>("/billing/invoices").catch(() => ({ data: [] as InvoiceRow[] }));
        setInvoices(inv.data);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
      await load();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Billing action failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function checkout(plan: "pro" | "team") {
    await run(`checkout-${plan}`, async () => {
      await startCheckout(plan, interval);
      // startCheckout redirects on success; reaching here means an in-place swap.
      toast("Plan updated.", "success");
    });
  }

  async function portal() {
    await run("portal", async () => {
      const res = await api.post<{ url: string }>("/billing/portal", {});
      window.location.href = res.url;
    });
  }

  async function cancel() {
    setConfirmCancel(false);
    await run("cancel", async () => {
      const res = await api.post<{ message: string }>("/billing/cancel", {});
      toast(res.message, "success");
    });
  }

  function openPlans() {
    setShowPlans(true);
    requestAnimationFrame(() => plansRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-live="polite">
        {[0, 1].map((i) => (
          <GlassPanel key={i} className="p-5">
            <Skeleton variant="text" width="8rem" height={16} className="mb-3" />
            <Skeleton variant="text" height={10} />
          </GlassPanel>
        ))}
      </div>
    );
  }

  if (error || !info) {
    return (
      <GlassPanel className="p-5">
        <EmptyState
          icon={<CreditCard size={22} />}
          message={error ?? "Billing isn't available right now."}
          action={
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Retry
            </Button>
          }
        />
      </GlassPanel>
    );
  }

  const sub = info.subscription;
  const pastDue = sub?.status === "past_due";
  const renewal = formatLongDate(sub?.ends_at ?? null);
  const paidPlan = PAID_PLANS.find((p) => p.key === info.plan.key);
  const membersUsed = info.usage.members?.used ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {info.test_mode && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-[13px]" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", color: "var(--tf-ink)" }} role="note">
          <FlaskConical size={15} aria-hidden="true" style={{ color: "var(--tf-warning-text, #b45309)" }} />
          <span>
            <strong>Test mode — no real charges.</strong> Use card <span className="font-mono">4242 4242 4242 4242</span> (any future expiry, any CVC).
          </span>
        </div>
      )}

      {pastDue && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-[13px]" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", color: "var(--tf-ink)" }} role="alert">
          <AlertTriangle size={15} aria-hidden="true" style={{ color: "var(--tf-danger-text)" }} />
          <span>
            <strong>Payment failed</strong> on your last invoice — your plan stays active for now. Update your card via the customer portal.
          </span>
        </div>
      )}

      {!canManage && (
        <GlassPanel className="p-5">
          <EmptyState
            icon={<CreditCard size={22} />}
            message={
              info.team_id === null
                ? "Billing lives on your team — create a team or accept an invite, then come back here."
                : "Only the team owner can manage billing — you're viewing this page read-only."
            }
          />
        </GlassPanel>
      )}

      {/* Current plan + payment method */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <GlassPanel className="p-6 lg:col-span-2 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10.5px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--tf-ink-muted)" }}>
                Current plan{info.team_name ? ` · ${info.team_name}` : ""}
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <span className="text-[28px] leading-none font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
                  {info.plan.name}
                </span>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: pastDue ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
                    color: pastDue ? "var(--tf-danger-text)" : "var(--tf-success-text)",
                  }}
                >
                  {pastDue ? "Past due" : sub ? (sub.on_grace_period ? "Cancels soon" : "Active") : "Active"}
                </span>
              </div>
              <p className="text-[13px] mt-2" style={{ color: "var(--tf-ink-soft)" }}>
                {paidPlan ? `${formatUsd(paidPlan.monthly)} / month` : "Free plan"}
                <span style={{ color: "var(--tf-ink-muted)" }}>
                  {" "}
                  • {membersUsed} member{membersUsed === 1 ? "" : "s"}
                </span>
              </p>
              <p className="text-[12.5px] mt-1 font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                {renewal
                  ? `${sub?.on_grace_period ? "Cancels on" : "Renews on"} ${renewal}`
                  : sub
                    ? "No renewal date scheduled"
                    : "No renewal — free plan"}
              </p>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={openPlans}>
                  Change plan
                </Button>
                {sub && !sub.on_grace_period && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
                    Cancel plan
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-6">
            {[
              `${formatLimit(info.plan.limits.members)} team members`,
              `${formatLimit(info.plan.limits.projects)} projects`,
              `${formatLimit(info.plan.limits.plan_imports)} plan imports / mo`,
              `${formatLimit(info.plan.limits.ai_messages)} AI actions / mo`,
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-[13px]" style={{ color: "var(--tf-ink-soft)" }}>
                <Check size={13} aria-hidden="true" style={{ color: "var(--tf-teal)" }} />
                {feature}
              </div>
            ))}
          </div>

          {sub && (
            <p className="text-[11.5px] mt-auto pt-5 font-mono" style={{ color: "var(--tf-ink-muted)" }}>
              Subscription {sub.status}
              {sub.stripe_price ? ` · ${sub.stripe_price}` : ""}
            </p>
          )}
        </GlassPanel>

        <GlassPanel className="p-6 flex flex-col">
          <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            Payment method
          </h2>
          <div
            className="mt-4 rounded-xl p-4 flex items-center gap-3"
            style={{ border: "1px solid var(--tf-panel-border)", background: "var(--tf-fill-03)" }}
          >
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--tf-fill-06)", color: "var(--tf-ink-muted)" }}
            >
              <CreditCard size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium" style={{ color: "var(--tf-ink)" }}>
                {sub ? "Card on file" : "No card on file"}
              </div>
              <div className="text-[11.5px]" style={{ color: "var(--tf-ink-muted)" }}>
                {sub ? "Managed securely by Stripe" : "You're on the free plan"}
              </div>
            </div>
          </div>
          <p className="text-[12px] mt-3 flex items-start gap-1.5" style={{ color: "var(--tf-ink-muted)" }}>
            <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
            Card details never touch TaskFlow — they're entered on Stripe.
          </p>
          {canManage && (
            <div className="mt-auto pt-4">
              {sub ? (
                <Button variant="secondary" size="sm" loading={busy === "portal"} onClick={() => void portal()}>
                  Update payment method
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={openPlans}>
                  Add payment method
                </Button>
              )}
            </div>
          )}
        </GlassPanel>
      </div>

      {/* Usage this month */}
      <GlassPanel className="p-6">
        <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
          Usage this month
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5 mt-5">
          {USAGE_METRICS.map((metric) => {
            const entry = info.usage[metric];
            if (!entry) return null;
            const pct = usagePercent(entry.used, entry.limit);
            const critical = pct !== null && pct >= 90;
            return (
              <div key={metric}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px]" style={{ color: "var(--tf-ink-soft)" }}>
                    {USAGE_LABEL[metric]}
                  </span>
                  <span className="text-[12px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                    {entry.used} / {formatLimit(entry.limit)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: "var(--tf-fill-08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct ?? 100}%`, background: critical ? "var(--tf-danger)" : "var(--tf-teal)" }}
                  />
                </div>
                <div className="text-[11px] mt-1.5" style={{ color: critical ? "var(--tf-danger-text)" : "var(--tf-ink-muted)" }}>
                  {pct === null ? "Unlimited" : `${pct}% used`}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11.5px] mt-5" style={{ color: "var(--tf-ink-muted)" }}>
          {METRIC_LABELS.plan_imports} and {METRIC_LABELS.ai_messages} reset at the start of each billing period.
        </p>
      </GlassPanel>

      {/* Plan switcher — hidden until "Change plan" is used, like the comp. */}
      {canManage && showPlans && (
        <div ref={plansRef}>
          <GlassPanel className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                  Change plan
                </h2>
                <p className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                  Switching takes effect immediately and is prorated by Stripe.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "var(--tf-fill-03)" }}>
                  {INTERVALS.map((i) => (
                    <button
                      key={i}
                      onClick={() => setInterval(i)}
                      aria-pressed={interval === i}
                      className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors"
                      style={{
                        background: interval === i ? "var(--tf-fill-12)" : "transparent",
                        color: interval === i ? "var(--tf-ink)" : "var(--tf-ink-muted)",
                      }}
                    >
                      {i === "monthly" ? "Monthly" : "Yearly (−20%)"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowPlans(false)}
                  aria-label="Close plan options"
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{ color: "var(--tf-ink-muted)" }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PAID_PLANS.map((p) => {
                const price = interval === "monthly" ? p.monthly : p.yearlyTotal / 12;
                const isCurrent = info.plan.key === p.key;
                return (
                  <div
                    key={p.key}
                    className="rounded-xl p-4 flex flex-col"
                    style={{ border: "1px solid var(--tf-panel-border)", background: "var(--tf-fill-02)" }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                        {p.name}
                      </span>
                      <span className="text-[14px] font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
                        {formatUsd(price)}
                        <span className="text-[11px] font-normal" style={{ color: "var(--tf-ink-muted)" }}>
                          {" "}
                          / mo{interval === "yearly" ? `, billed ${formatUsd(p.yearlyTotal)}/yr` : ""}
                        </span>
                      </span>
                    </div>
                    <p className="text-[12px] mt-1 mb-3" style={{ color: "var(--tf-ink-muted)" }}>
                      {p.blurb}
                    </p>
                    <div className="mt-auto">
                      <Button
                        variant={isCurrent ? "secondary" : "primary"}
                        size="sm"
                        disabled={isCurrent}
                        loading={busy === `checkout-${p.key}`}
                        onClick={() => void checkout(p.key)}
                      >
                        {isCurrent ? "Current plan" : sub ? `Switch to ${p.name}` : `Upgrade to ${p.name}`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Invoices */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[16px] font-semibold font-display flex items-center gap-1.5" style={{ color: "var(--tf-ink)" }}>
            <Receipt size={15} aria-hidden="true" /> Invoices
          </h2>
          <span className="text-[11.5px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
            {invoices.length} total
          </span>
        </div>
        {invoices.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>
            No invoices yet — they appear here after your first payment.
          </p>
        ) : (
          <div className="overflow-x-auto tf-scroll">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: "var(--tf-ink-muted)" }}>
                  <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">INVOICE</th>
                  <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">DATE</th>
                  <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">AMOUNT</th>
                  <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">STATUS</th>
                  <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 text-right">RECEIPT</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
                    <td className="py-3 pr-4 font-mono text-[11.5px] max-w-[180px] truncate" style={{ color: "var(--tf-ink-soft)" }} title={inv.id}>
                      {inv.id}
                    </td>
                    <td className="py-3 pr-4 text-[12.5px]" style={{ color: "var(--tf-ink-muted)" }}>
                      {formatLongDate(inv.date) ?? "—"}
                    </td>
                    <td className="py-3 pr-4 font-medium" style={{ color: "var(--tf-ink)" }}>
                      {formatUsd(inv.amount / 100)} <span className="text-[11px] uppercase" style={{ color: "var(--tf-ink-muted)" }}>{inv.currency}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full capitalize"
                        style={{ background: "rgba(34,197,94,0.12)", color: "var(--tf-success-text)" }}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {inv.url ? (
                        <a href={inv.url} target="_blank" rel="noreferrer" className="text-[12px] font-medium hover:underline" style={{ color: "var(--tf-primary)" }}>
                          Download PDF
                        </a>
                      ) : (
                        <span className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel subscription?"
        message="Your plan stays active until the end of the billing period, then drops to Free. Usage limits apply immediately after."
        confirmLabel="Cancel subscription"
        onConfirm={() => void cancel()}
      />
    </div>
  );
}
