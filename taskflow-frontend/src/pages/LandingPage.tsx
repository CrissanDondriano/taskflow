import { Link } from "react-router-dom";
import { Check, Lock, Download, ShieldCheck } from "lucide-react";
import { Container, SectionHead, ButtonLink, Faq } from "../components/marketing/Bits";
import { Reveal } from "../components/marketing/Reveal";
import { DashboardMock } from "../components/marketing/Visuals";
import { ProductTour } from "../components/marketing/ProductTour";
import { HeroBackdrop } from "../components/marketing/HeroBackdrop";
import { PricingCards, CtaBand } from "../components/marketing/Sections";
import { usePageMeta } from "../hooks/usePageMeta";
import { FEATURES, INTEGRATIONS, STEPS, FAQS } from "../data/marketing";

const TRUST = ["Free plan, no expiry", "No credit card", "Set up in minutes"];
const SECURITY = [
  { icon: Lock, title: "Your data stays yours", desc: "Every project is private to your workspace and its members." },
  { icon: Download, title: "Export any time", desc: "Take your tasks, reports and files with you, on any plan." },
  { icon: ShieldCheck, title: "Roles and SSO", desc: "Assign roles per member. SSO and audit logs are on Enterprise." },
];
const PANEL = { background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" };
const MUTED = { color: "var(--tf-ink-muted)" };

export function LandingPage() {
  usePageMeta("Home", "TaskFlow AI reads your projects, ranks work by deadline risk, and turns meeting notes into tasks. Start free.");
  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden pb-20 pt-16 sm:pt-24 lg:pb-28">
        <div className="aurora pointer-events-none absolute inset-0" aria-hidden="true" />
        <HeroBackdrop />
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 id="hero-title" className="rise font-display text-[36px] font-semibold leading-[1.08] text-balance sm:text-[56px]">
              Stop chasing status. Let AI tell your team what to do <span className="text-gradient">next</span>
            </h1>
            <p className="rise mx-auto mt-5 max-w-[56ch] text-[16px] leading-relaxed sm:text-[18px]" style={{ animationDelay: "100ms", ...MUTED }}>
              TaskFlow AI ranks every task by risk, turns meeting notes into owned tasks, and keeps your whole team on one screen.
            </p>
            <div className="rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "200ms" }}>
              <ButtonLink to="/signup">Start free</ButtonLink>
              <ButtonLink to="/features" variant="ghost">See how it works</ButtonLink>
            </div>
            <ul className="rise m-0 mt-6 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-2 p-0 text-[13px]" style={{ animationDelay: "280ms", ...MUTED }}>
              {TRUST.map((t) => <li key={t} className="flex items-center gap-1.5"><Check size={14} color="#14B8A6" aria-hidden="true" />{t}</li>)}
            </ul>
          </div>
          <div className="rise mt-14 sm:mt-16" style={{ animationDelay: "380ms" }}><DashboardMock /></div>
        </Container>
      </section>

      {/* Integrations: a fixed, contained grid (no endless scrolling) */}
      <section aria-labelledby="int-title" className="py-14" style={{ borderTop: "1px solid var(--tf-panel-border)", borderBottom: "1px solid var(--tf-panel-border)" }}>
        <Container>
          <Reveal><h2 id="int-title" className="mb-8 text-center text-[15px] font-medium" style={MUTED}>Fits into the tools your team already uses</h2></Reveal>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 lg:grid-cols-5">
            {INTEGRATIONS.map(({ icon: Icon, name, desc }, i) => (
              <li key={name} className={i === 4 ? "col-span-2 md:col-span-1" : ""}>
                <Reveal delay={i * 80} className="h-full">
                  <div className="lift flex h-full flex-col items-center rounded-2xl px-4 py-5 text-center" style={PANEL}>
                    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(37,99,235,0.14)" }}><Icon size={18} color="#93C5FD" aria-hidden="true" /></span>
                    <p className="text-[14px] font-semibold">{name}</p>
                    <p className="mt-1 text-[12px] leading-snug" style={MUTED}>{desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Product tour */}
      <section aria-labelledby="tour-title" className="py-20 lg:py-28">
        <Container>
          <Reveal><SectionHead id="tour-title" title="One workspace that thinks with you" lead="Take a look around. Pick a view to see how it works." /></Reveal>
          <Reveal delay={100}><ProductTour /></Reveal>
        </Container>
      </section>

      {/* Everything: features + steps + trust in one section */}
      <section aria-labelledby="all-title" className="py-20 lg:py-28" style={{ background: "rgba(255,255,255,0.015)" }}>
        <Container>
          <Reveal><SectionHead id="all-title" title="Everything your team needs, from first project to finished sprint" lead="Built to remove a step, not add one, and to be trusted with your work." /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 70} className="h-full">
                  <div className="lift h-full rounded-2xl p-6" style={PANEL}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(37,99,235,0.14)" }}><Icon size={20} color="#93C5FD" aria-hidden="true" /></span>
                    <h3 className="mb-2 mt-4 text-[16px] font-semibold">{title}</h3>
                    <p className="text-[13px] leading-relaxed" style={MUTED}>{desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>

          <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <Reveal><h3 className="mb-8 font-display text-[22px] font-semibold">From blank project to finished sprint</h3></Reveal>
              <ol className="relative m-0 list-none p-0">
                <span aria-hidden="true" className="absolute bottom-2 left-5 top-2 w-px" style={{ background: "var(--tf-panel-border)" }} />
                {STEPS.map((s, i) => (
                  <li key={s.title} className="relative pb-8 pl-14 last:pb-0">
                    <span aria-hidden="true" className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full font-display text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg,#2563EB,#14B8A6)", boxShadow: "0 0 0 5px var(--tf-void)" }}>{i + 1}</span>
                    <Reveal delay={i * 90}>
                      <h4 className="text-[15px] font-semibold">{s.title}</h4>
                      <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed" style={MUTED}>{s.desc}</p>
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
            <div className="lg:col-span-5">
              <Reveal delay={120} className="h-full">
                <div className="h-full rounded-2xl p-6 sm:p-8" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.4)" }}>
                  <h3 className="mb-6 font-display text-[22px] font-semibold">Built to be trusted with your work</h3>
                  <ul className="m-0 flex list-none flex-col gap-6 p-0">
                    {SECURITY.map(({ icon: Icon, title, desc }) => (
                      <li key={title} className="flex gap-4">
                        <Icon size={20} className="mt-0.5 shrink-0" color="#5EEAD4" aria-hidden="true" />
                        <div><h4 className="text-[15px] font-semibold">{title}</h4><p className="mt-1 text-[13px] leading-relaxed" style={MUTED}>{desc}</p></div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* Pricing */}
      <section aria-labelledby="pricing-title" className="py-20 lg:py-28">
        <Container>
          <Reveal><SectionHead id="pricing-title" title="Start free. Upgrade when you need to." lead="No credit card to start. Export your data on any plan." /></Reveal>
          <PricingCards />
          <p className="mt-8 text-center text-[14px]"><Link to="/pricing" className="underline underline-offset-4">See full plan details and FAQs</Link></p>
        </Container>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="pb-20 lg:pb-28">
        <Container className="max-w-3xl">
          <Reveal><SectionHead id="faq-title" title="Frequently asked questions" /></Reveal>
          <Reveal delay={100}><Faq items={FAQS} /></Reveal>
        </Container>
      </section>

      <CtaBand />
    </>
  );
}