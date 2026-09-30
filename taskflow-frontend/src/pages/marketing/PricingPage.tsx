import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Container, SectionHead, ButtonLink, Faq } from "../../components/marketing/Bits";
import { usePageMeta } from "../../hooks/usePageMeta";
import { PLANS, FAQS } from "../../data/marketing";

export function PricingPage() {
  usePageMeta("Pricing", "Start free with 3 projects. Upgrade to Pro at $14 per user per month, or contact us for Enterprise.");
  return (
    <Container className="py-16 lg:py-24">
      <SectionHead title="Simple pricing" lead="Start free. Upgrade when you need more projects or the full AI suite." />
      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <section key={p.name} aria-labelledby={`plan-${p.name}`} className="flex flex-col rounded-2xl p-6"
            style={{ background: p.featured ? "rgba(37,99,235,0.08)" : "var(--tf-panel)", border: `1px solid ${p.featured ? "rgba(37,99,235,0.5)" : "var(--tf-panel-border)"}` }}>
            <h2 id={`plan-${p.name}`} className="text-[16px] font-semibold">{p.name}{p.featured && <span className="ml-2 text-[12px] font-normal" style={{ color: "var(--tf-teal)" }}>Most popular</span>}</h2>
            <p className="mt-3"><span className="font-display text-[32px] font-semibold">{p.price}</span> <span className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>{p.period}</span></p>
            <ul className="my-6 flex flex-1 list-none flex-col gap-2 p-0 text-[13px]" style={{ color: "#C7D2E3" }}>
              {p.features.map((f) => <li key={f} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0" color="#14B8A6" aria-hidden="true" />{f}</li>)}
            </ul>
            <ButtonLink to={p.name === "Enterprise" ? "/contact" : "/signup"} variant={p.featured ? "primary" : "ghost"}>{p.cta}</ButtonLink>
          </section>
        ))}
      </div>
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-6 font-display text-[24px] font-semibold">Pricing questions</h2>
        <Faq items={FAQS} />
        <p className="mt-6 text-[14px]">Still unsure? <Link to="/contact" className="underline underline-offset-4">Contact us</Link>.</p>
      </div>
    </Container>
  );
}
