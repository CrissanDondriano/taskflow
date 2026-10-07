import { Check } from "lucide-react";
import { ButtonLink, Container } from "./Bits";
import { Reveal } from "./Reveal";
import { PLANS } from "../../data/marketing";

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function PricingCards({ level = 3 }: { level?: 2 | 3 }) {
  const H = `h${level}` as "h2" | "h3";
  return (
    <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
      {PLANS.map((p, i) => (
        <Reveal key={p.name} delay={i * 100} className="h-full">
          <div className={`h-full rounded-2xl p-px ${p.featured ? "md:scale-[1.03]" : ""}`} style={{ background: p.featured ? "linear-gradient(160deg,#2563EB,#14B8A6)" : "var(--tf-panel-border)", boxShadow: p.featured ? "0 20px 60px rgba(37,99,235,0.25)" : undefined }}>
            <section aria-labelledby={`plan-${p.name}-${level}`} className="relative flex h-full flex-col rounded-[15px] p-6 sm:p-7" style={{ background: "var(--tf-surface)" }}>
              {p.featured && <span className="absolute right-5 top-5 rounded-full px-3 py-1 text-[12px] font-medium text-white" style={{ background: "linear-gradient(135deg,#2563EB,#14B8A6)" }}>Most popular</span>}
              <H id={`plan-${p.name}-${level}`} className="text-[18px] font-semibold">{p.name}</H>
              <p className="mt-1 min-h-10 text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>{p.tagline}</p>
              <p className="mt-4"><span className="font-display text-[40px] font-semibold leading-none">{p.price}</span> <span className="ml-1 text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>{p.period}</span></p>
              <div className="mt-6"><ButtonLink to={p.name === "Enterprise" ? "/contact" : "/signup"} variant={p.featured ? "primary" : "ghost"}>{p.cta}</ButtonLink></div>
              <p className="mb-3 mt-7 text-[13px] font-semibold">{p.name === "Free" ? "Includes" : p.name === "Pro" ? "Everything in Free, plus" : "Everything in Pro, plus"}</p>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[14px]" style={{ color: "var(--tf-ink-soft)" }}>
                {p.features.map((f) => <li key={f} className="flex items-start gap-2.5"><Check size={16} className="mt-0.5 shrink-0" color="#14B8A6" aria-hidden="true" />{f}</li>)}
              </ul>
            </section>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function CtaBand({ title = "Plan your next sprint with real risk numbers", text = "Create a project in minutes. The free plan never expires." }: { title?: string; text?: string }) {
  return (
    <section aria-label="Get started" className="pb-24">
      <Container>
        <Reveal>
          <div className="aurora relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-16" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
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