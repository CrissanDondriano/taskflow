import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CreditCard, FlaskConical, Receipt } from "lucide-react";
import { GlassPanel, EmptyState, ConfirmDialog } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
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

interface InvoiceRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string | null;
  url: string | null;
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

  if (loading) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-live="polite">
        {[0, 1].map((i) => (
          <GlassPanel key={i} className="p-5">
            <div className="h-4 w-32 rounded animate-pulse mb-3" style={{ background: "var(--tf-fill-08)" }} />
            <div className="h-2.5 rounded animate-pulse" style={{ background: "var(--tf-fill-06)" }} />
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
          <AlertTriangle size={15} aria-hidden="true" style={{ color: "var(--tf-danger)" }} />
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

      <GlassPanel className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
              Current plan{info.team_name ? ` · ${info.team_name}` : ""}
            </div>
            <div className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
              {info.plan.name}
            </div>
            {sub && (
              <p className="text-xs mt-1 font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                Subscription {sub.status}
                {sub.ends_at ? ` · ends ${sub.ends_at.slice(0, 10)}` : ""}
                {sub.on_grace_period ? " · cancels at period end" : ""}
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" loading={busy === "portal"} onClick={() => void portal()}>
                Manage subscription
              </Button>
              {sub && !sub.on_grace_period && (
                <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {(Object.keys(METRIC_LABELS) as UsageMetric[]).map((metric) => {
            const entry = info.usage[metric];
            if (!entry) return null;
            const pct = usagePercent(entry.used, entry.limit);
            return (
              <div key={metric}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--tf-ink-soft)" }}>{METRIC_LABELS[metric]}</span>
                  <span className="font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                    {entry.used} / {formatLimit(entry.limit)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct ?? 100}%`,
                      background: pct !== null && pct >= 90 ? "var(--tf-danger)" : "var(--tf-teal)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {canManage && (
        <GlassPanel className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              Upgrade
            </h2>
            <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "var(--tf-fill-03)" }}>
              {INTERVALS.map((i) => (
                <button
                  key={i}
                  onClick={() => setInterval(i)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                  style={{ background: interval === i ? "var(--tf-primary)" : "transparent", color: interval === i ? "white" : "var(--tf-ink-muted)" }}
                >
                  {i === "monthly" ? "Monthly" : "Yearly (−20%)"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PAID_PLANS.map((p) => {
              const price = interval === "monthly" ? p.monthly : p.yearlyTotal / 12;
              const isCurrent = info.plan.key === p.key;
              return (
                <div key={p.key} className="rounded-xl p-4" style={{ border: "1px solid var(--tf-panel-border)" }}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                      {p.name}
                    </span>
                    <span className="text-sm font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
                      {formatUsd(price)}
                      <span className="text-[11px] font-normal" style={{ color: "var(--tf-ink-muted)" }}>
                        {" "}
                        / mo{interval === "yearly" ? `, billed ${formatUsd(p.yearlyTotal)}/yr` : ""}
                      </span>
                    </span>
                  </div>
                  <p className="text-xs mt-1 mb-3" style={{ color: "var(--tf-ink-muted)" }}>
                    {p.blurb}
                  </p>
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
              );
            })}
          </div>
        </GlassPanel>
      )}

      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold font-display mb-3 flex items-center gap-1.5" style={{ color: "var(--tf-ink)" }}>
          <Receipt size={14} aria-hidden="true" /> Invoices
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>
            No invoices yet — they appear here after your first payment.
          </p>
        ) : (
          <div className="overflow-x-auto tf-scroll">
            <table className="w-full text-[13px]">
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
                    <td className="py-2.5 pr-4 font-mono text-xs" style={{ color: "var(--tf-ink-muted)" }}>
                      {inv.date ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4" style={{ color: "var(--tf-ink)" }}>
                      {formatUsd(inv.amount / 100)} {inv.currency}
                    </td>
                    <td className="py-2.5 pr-4 text-xs capitalize" style={{ color: "var(--tf-ink-muted)" }}>
                      {inv.status}
                    </td>
                    <td className="py-2.5 text-right">
                      {inv.url && (
                        <a href={inv.url} target="_blank" rel="noreferrer" className="text-xs font-medium hover:underline" style={{ color: "var(--tf-primary)" }}>
                          View
                        </a>
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
