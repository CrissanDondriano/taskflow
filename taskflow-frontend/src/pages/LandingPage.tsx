import { Link } from "react-router-dom";
import { Check, X, Lock, Download, ShieldCheck } from "lucide-react";
import { Container, SectionHead, ButtonLink, Faq } from "../components/marketing/Bits";
import { Reveal } from "../components/marketing/Reveal";
import { DashboardMock } from "../components/marketing/Visuals";
import { ProductTour } from "../components/marketing/ProductTour";
import { usePageMeta } from "../hooks/usePageMeta";
import { FEATURES, STEPS, FAQS, PLANS } from "../data/marketing";

const TOOLS = ["Slack", "Google Calendar", "Outlook", "Email", "Meeting transcripts", "CSV export"];
const TRUST = ["Free plan, no expiry", "No credit card", "Set up in minutes"];
const BEFORE = ["Status lives in meetings and chat threads", "You find out a task is late after it is", "Meeting notes sit in a doc nobody reopens", "Reports are assembled by hand every week"];
const AFTER = ["Live status on one Mission Control screen", "Risk is scored and flagged before deadlines slip", "Paste a transcript, get owned tasks in your Backlog", "Reports write themselves from real project data"];
const SECURITY = [
  { icon: Lock, title: "Your data stays yours", desc: "Every project is private to your workspace and its members." },
  { icon: Download, title: "Export any time", desc: "Take your tasks, reports and files with you, on any plan." },
  { icon: ShieldCheck, title: "Roles and SSO", desc: "Assign roles per member. SSO and audit logs are on Enterprise." },
];

export function LandingPage() {
  usePageMeta("Home", "TaskFlow AI reads your projects, ranks work by deadline risk, and turns meeting notes into tasks. Start free.");
  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden pb-20 pt-16 sm:pt-24 lg:pb-28">
        <div className="aurora pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="grid-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="rise mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px]" style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.3)", color: "#5EEAD4" }}>
              <span className="pulse-dot h-1.5 w-1.5 rounded-full" style={{ background: "#2DD4BF" }} aria-hidden="true" /> AI task assistant now built in
            </p>
            <h1 id="hero-title" className="rise font-display text-[36px] font-semibold leading-[1.08] text-balance sm:text-[56px]" style={{ animationDelay: "80ms" }}>
              Stop chasing status. Let AI tell your team what to do <span className="text-gradient">next</span>
            </h1>
            <p className="rise mx-auto mt-5 max-w-[56ch] text-[16px] leading-relaxed sm:text-[18px]" style={{ animationDelay: "160ms", color: "var(--tf-ink-muted)" }}>
              TaskFlow AI ranks every task by risk, turns meeting notes into owned tasks, and keeps your whole team on one screen.
            </p>
            <div className="rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "240ms" }}>
              <ButtonLink to="/signup">Start free</ButtonLink>
              <ButtonLink to="/features" variant="ghost">See how it works</ButtonLink>
            </div>
            <ul className="rise m-0 mt-6 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-2 p-0 text-[13px]" style={{ animationDelay: "300ms", color: "var(--tf-ink-muted)" }}>
              {TRUST.map((t) => <li key={t} className="flex items-center gap-1.5"><Check size={14} color="#14B8A6" aria-hidden="true" />{t}</li>)}
            </ul>
          </div>
          <div className="rise mt-14 sm:mt-16" style={{ animationDelay: "380ms" }}><DashboardMock /></div>
        </Container>
      </section>

      {/* Integrations */}
      <section aria-label="Works with your tools" className="py-10" style={{ borderTop: "1px solid var(--tf-panel-border)", borderBottom: "1px solid var(--tf-panel-border)" }}>
        <p className="mb-5 text-center text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>Fits into the tools your team already uses</p>
        <div className="overflow-hidden" style={{ WebkitMaskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)", maskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)" }}>
          <div className="marquee-track gap-4 pr-4">
            {[...TOOLS, ...TOOLS].map((t, i) => (
              <span key={`${t}-${i}`} aria-hidden={i >= TOOLS.length} className="whitespace-nowrap rounded-full px-5 py-2 text-[14px] font-medium" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Product tour */}
      <section aria-labelledby="tour-title" className="py-20 lg:py-28">
        <Container>
          <Reveal><SectionHead id="tour-title" title="One workspace that thinks with you" lead="Take a look around. Pick a view to see how it works." /></Reveal>
          <Reveal delay={100}><ProductTour /></Reveal>
        </Container>
      </section>

      {/* Before / after */}
      <section aria-labelledby="ba-title" className="py-20 lg:py-24" style={{ background: "rgba(255,255,255,0.015)" }}>
        <Container>
          <Reveal><SectionHead id="ba-title" title="Less status-chasing, more shipping" lead="What changes when your tasks can read themselves." /></Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Reveal className="h-full">
              <div className="h-full rounded-2xl p-6 sm:p-8" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
                <h3 className="mb-4 text-[16px] font-semibold">Without TaskFlow AI</h3>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {BEFORE.map((b) => <li key={b} className="flex items-start gap-3 text-[14px]" style={{ color: "var(--tf-ink-muted)" }}><X size={16} className="mt-0.5 shrink-0" color="#F87171" aria-hidden="true" />{b}</li>)}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120} className="h-full">
              <div className="h-full rounded-2xl p-6 sm:p-8" style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.5)" }}>
                <h3 className="mb-4 text-[16px] font-semibold">With TaskFlow AI</h3>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {AFTER.map((a) => <li key={a} className="flex items-start gap-3 text-[14px]"><Check size={16} className="mt-0.5 shrink-0" color="#14B8A6" aria-hidden="true" />{a}</li>)}
                </ul>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Feature grid */}
      <section aria-labelledby="features-title" className="py-20 lg:py-28">
        <Container>
          <Reveal><SectionHead id="features-title" title="Everything your team needs" lead="Built to remove a step, not add one." /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 70} className="h-full">
                  <div className="lift h-full rounded-2xl p-6" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(37,99,235,0.14)" }}><Icon size={20} color="#93C5FD" aria-hidden="true" /></span>
                    <h3 className="mb-2 mt-4 text-[16px] font-semibold">{title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-title" className="py-20 lg:py-24" style={{ background: "rgba(255,255,255,0.015)" }}>
        <Container>
          <Reveal><SectionHead id="how-title" title="From blank project to finished sprint" lead="Five steps, in order." /></Reveal>
          <ol className="m-0 grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 110}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full font-display text-[15px] font-semibold text-white" style={{ background: "linear-gradient(135deg,#2563EB,#14B8A6)" }}>{i + 1}</span>
                  <h3 className="mb-1 mt-4 text-[15px] font-semibold">{s.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{s.desc}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Security */}
      <section aria-labelledby="sec-title" className="py-20 lg:py-28">
        <Container>
          <Reveal><SectionHead id="sec-title" title="Built to be trusted with your work" /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-3">
            {SECURITY.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 100}>
                  <Icon size={22} color="#5EEAD4" aria-hidden="true" />
                  <h3 className="mb-1.5 mt-3 text-[16px] font-semibold">{title}</h3>
                  <p className="max-w-[40ch] text-[14px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Pricing teaser */}
      <section aria-labelledby="pricing-title" className="py-20 lg:py-24" style={{ background: "rgba(255,255,255,0.015)" }}>
        <Container>
          <Reveal><SectionHead id="pricing-title" title="Start free. Upgrade when you need to." /></Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 100} className="h-full">
                <div className="lift flex h-full flex-col rounded-2xl p-6" style={{ background: p.featured ? "rgba(37,99,235,0.1)" : "var(--tf-panel)", border: `1px solid ${p.featured ? "rgba(37,99,235,0.5)" : "var(--tf-panel-border)"}` }}>
                  <h3 className="text-[16px] font-semibold">{p.name}{p.featured && <span className="ml-2 text-[12px] font-normal" style={{ color: "#5EEAD4" }}>Most popular</span>}</h3>
                  <p className="mt-2"><span className="font-display text-[30px] font-semibold">{p.price}</span> <span className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>{p.period}</span></p>
                  <ul className="m-0 my-5 flex flex-1 list-none flex-col gap-2 p-0 text-[13px]" style={{ color: "#C7D2E3" }}>
                    {p.features.slice(0, 3).map((f) => <li key={f} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0" color="#14B8A6" aria-hidden="true" />{f}</li>)}
                  </ul>
                  <ButtonLink to={p.name === "Enterprise" ? "/contact" : "/signup"} variant={p.featured ? "primary" : "ghost"}>{p.cta}</ButtonLink>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-[14px]"><Link to="/pricing" className="underline underline-offset-4">Compare all plans</Link></p>
        </Container>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="py-20 lg:py-28">
        <Container className="max-w-3xl">
          <Reveal><SectionHead id="faq-title" title="Frequently asked questions" /></Reveal>
          <Reveal delay={100}><Faq items={FAQS} /></Reveal>
        </Container>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="cta-title" className="pb-24">
        <Container>
          <Reveal>
            <div className="aurora relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-16" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
              <h2 id="cta-title" className="mx-auto max-w-2xl font-display text-[26px] font-semibold text-balance sm:text-[34px]">Plan your next sprint with real risk numbers</h2>
              <p className="mx-auto mt-3 max-w-[48ch] text-[15px]" style={{ color: "var(--tf-ink-muted)" }}>Create a project in minutes. The free plan never expires.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink to="/signup">Start free</ButtonLink>
                <ButtonLink to="/contact" variant="ghost">Talk to sales</ButtonLink>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}