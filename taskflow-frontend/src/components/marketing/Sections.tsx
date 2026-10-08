import { useState } from "react";
import { Check } from "lucide-react";
import { ButtonLink, Container } from "./Bits";
import { Reveal } from "./Reveal";
import { PLANS } from "../../data/marketing";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError } from "../../lib/api";
import { type BillingInterval, formatUsd, startCheckout } from "../../lib/billing";
import { Button } from "../ui/Button";

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function PricingCards({ level = 3 }: { level?: 2 | 3 }) {
  const H = `h${level}` as "h2" | "h3";
  const { user } = useAuth();
  const { toast } = useToast();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState<string | null>(null);

  async function checkoutPro() {
    setBusy("Pro");
    try {
      await startCheckout("pro", interval);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't start checkout.", "error");
    } finally {
      setBusy(null);
    }
  }

  // Yearly Pro works out to $11.20/mo, billed $134.40/yr (~20% off monthly).
  function priceFor(name: string): { amount: string; period: string } {
    if (name !== "Pro" || interval === "monthly") {
      const p = PLANS.find((x) => x.name === name);
      return { amount: p?.price ?? "", period: p?.period ?? "" };
    }
    return { amount: formatUsd(134.4 / 12), period: "per user / month, billed $134.40/yr" };
  }

  return (
    <>
      <div className="flex justify-center mb-8">
        <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "var(--tf-fill-03)" }}>
          {(["monthly", "yearly"] as const).map((i) => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors hover:opacity-80"
              style={{ background: interval === i ? "var(--tf-primary)" : "transparent", color: interval === i ? "white" : "var(--tf-ink-muted)" }}
            >
              {i === "monthly" ? "Monthly" : "Yearly (−20%)"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
        {PLANS.map((p, i) => {
          const price = priceFor(p.name);
          const checkoutable = p.name === "Pro" && user;
          return (
            <Reveal key={p.name} delay={i * 100} className="h-full">
              <div className={`h-full rounded-2xl p-px ${p.featured ? "md:scale-[1.03]" : ""}`} style={{ background: p.featured ? "linear-gradient(160deg,#2563EB,#14B8A6)" : "var(--tf-panel-border)", boxShadow: p.featured ? "0 20px 60px rgba(37,99,235,0.25)" : undefined }}>
                <section aria-labelledby={`plan-${p.name}-${level}`} className="relative flex h-full flex-col rounded-[15px] p-6 sm:p-7" style={{ background: "var(--tf-surface)" }}>
                  {p.featured && <span className="absolute right-5 top-5 rounded-full px-3 py-1 text-[12px] font-medium text-white" style={{ background: "linear-gradient(135deg,#2563EB,#14B8A6)" }}>Most popular</span>}
                  <H id={`plan-${p.name}-${level}`} className="text-[18px] font-semibold">{p.name}</H>
                  <p className="mt-1 min-h-10 text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>{p.tagline}</p>
                  <p className="mt-4"><span className="font-display text-[40px] font-semibold leading-none">{price.amount}</span> <span className="ml-1 text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>{price.period}</span></p>
                  <div className="mt-6">
                    {checkoutable ? (
                      <Button variant="primary" fullWidth loading={busy === "Pro"} onClick={() => void checkoutPro()}>
                        Start free trial
                      </Button>
                    ) : (
                      <ButtonLink to={p.name === "Enterprise" ? "/contact" : "/signup"} variant={p.featured ? "primary" : "ghost"}>{p.cta}</ButtonLink>
                    )}
                  </div>
                  <p className="mb-3 mt-7 text-[13px] font-semibold">{p.name === "Free" ? "Includes" : p.name === "Pro" ? "Everything in Free, plus" : "Everything in Pro, plus"}</p>
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[14px]" style={{ color: "var(--tf-ink-soft)" }}>
                    {p.features.map((f) => <li key={f} className="flex items-start gap-2.5"><Check size={16} className="mt-0.5 shrink-0" color="#14B8A6" aria-hidden="true" />{f}</li>)}
                  </ul>
                </section>
              </div>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}

export function CtaBand({ title = "Plan your next sprint with real risk numbers", text = "Create a project in minutes. The free plan never expires." }: { title?: string; text?: string }) {
  return (
    <section aria-label="Get started" className="pb-24">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-16" style={{ background: "radial-gradient(60% 55% at 12% 0%, rgba(37,99,235,0.35), transparent 70%), radial-gradient(50% 45% at 92% 8%, rgba(20,184,166,0.28), transparent 70%), linear-gradient(135deg, rgba(37,99,235,0.14), rgba(20,184,166,0.10)), var(--tf-panel)", border: "1px solid rgba(37,99,235,0.35)", boxShadow: "0 20px 60px rgba(37,99,235,0.18)" }}>
            <h2 className="mx-auto max-w-2xl font-display text-[26px] font-semibold text-balance sm:text-[34px]">{title}</h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-[15px]" style={{ color: "var(--tf-ink-muted)" }}>{text}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink to="/signup">Start free</ButtonLink>
              <ButtonLink to="/contact" variant="ghost">Talk to sales</ButtonLink>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}