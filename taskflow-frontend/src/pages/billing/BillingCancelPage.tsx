import { Container, ButtonLink } from "../../components/marketing/Bits";
import { usePageMeta } from "../../hooks/usePageMeta";

/** Stripe redirects here when checkout is abandoned — no harm done. */
export function BillingCancelPage() {
  usePageMeta("Checkout canceled", "Your TaskFlow AI checkout was canceled before payment.");

  return (
    <section className="py-20 sm:py-28">
      <Container className="max-w-lg text-center">
        <h1 className="font-display text-[28px] font-semibold">No worries — nothing was charged</h1>
        <p className="mx-auto mt-3 max-w-[48ch] text-[15px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>
          You left checkout before paying. Your workspace is untouched, and the free plan keeps working.
        </p>
        <div className="mt-8">
          <ButtonLink to="/pricing">Compare plans again</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
