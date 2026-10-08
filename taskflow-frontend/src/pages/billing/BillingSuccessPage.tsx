import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Container, ButtonLink } from "../../components/marketing/Bits";
import { usePageMeta } from "../../hooks/usePageMeta";

/**
 * Stripe redirects here after a successful Checkout. The webhook (not this
 * page) flips the plan, so it can lag a minute behind — say so honestly.
 */
export function BillingSuccessPage() {
  usePageMeta("Checkout complete", "Your TaskFlow AI subscription is being activated.");

  return (
    <section className="py-20 sm:py-28">
      <Container className="max-w-lg text-center">
        <CheckCircle2 size={40} color="#22C55E" className="mx-auto" aria-hidden="true" />
        <h1 className="mt-4 font-display text-[28px] font-semibold">You're upgraded</h1>
        <p className="mx-auto mt-3 max-w-[48ch] text-[15px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>
          Payment went through. Your plan activates within a minute or so — if the billing page still shows the old
          plan, give it a refresh.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink to="/dashboard/billing">View billing</ButtonLink>
          <Link to="/dashboard" className="text-[14px] font-medium underline underline-offset-4" style={{ color: "var(--tf-ink-muted)" }}>
            Back to dashboard
          </Link>
        </div>
      </Container>
    </section>
  );
}
