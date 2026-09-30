import { Link } from "react-router-dom";
import { Container, SectionHead, ButtonLink, Faq } from "../components/marketing/Bits";
import { usePageMeta } from "../hooks/usePageMeta";
import { FEATURES, STEPS, SCENARIOS, FAQS } from "../data/marketing";

const RISK = { late: "#F87171", soon: "#FBBF24", ok: "#2DD4BF" } as const;
const SAMPLE = [
  { task: "Ship billing webhook", project: "Payments", due: "Due tomorrow", tone: "late", label: "At risk" },
  { task: "Review onboarding copy", project: "Growth", due: "Due Friday", tone: "soon", label: "Watch" },
  { task: "Update API docs", project: "Platform", due: "Due next week", tone: "ok", label: "On track" },
  { task: "Plan Q4 roadmap", project: "Product", due: "Due in 2 weeks", tone: "ok", label: "On track" },
] as const;

/** The product's core idea, shown instead of a generic dashboard screenshot. */
function TodayPanel() {
  return (
    <figure className="m-0" aria-label="Sample view of Today, ranked by risk">
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)", boxShadow: "0 24px 60px rgba(0,0,0,0.45)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
          <p className="text-[14px] font-semibold">Today, ranked by risk</p>
          <p className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>Sample data</p>
        </div>
        <ul className="m-0 list-none p-0">
          {SAMPLE.map((r, i) => (
            <li key={r.task} className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3.5" style={{ borderTop: i ? "1px solid var(--tf-panel-border)" : undefined }}>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{r.task}</p>
                <p className="truncate text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>{r.project} · {r.due}</p>
              </div>
              <span className="flex items-center gap-2 text-[12px] font-medium">
                <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: RISK[r.tone] }} />
                {r.label}
              </span>
            </li>
          ))}
        </ul>
        <div className="px-5 py-4 text-[13px] leading-relaxed" style={{ background: "rgba(20,184,166,0.08)", borderTop: "1px solid var(--tf-panel-border)" }}>
          Start with the billing webhook. It's due tomorrow and blocks two other tasks.
        </div>
      </div>
    </figure>
  );
}

export function LandingPage() {
  usePageMeta("Home", "TaskFlow AI reads your projects, ranks work by deadline risk, and turns meeting notes into tasks. Start free.");
  return (
    <>
      <section aria-labelledby="hero-title" className="py-16 sm:py-20 lg:py-28">
        <Container className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <h1 id="hero-title" className="font-display text-[34px] font-semibold leading-[1.1] text-balance sm:text-[48px]">
              Know what to work on before the deadline knows you
            </h1>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed sm:text-[17px]" style={{ color: "var(--tf-ink-muted)" }}>
              TaskFlow AI reads your projects, ranks every task by risk, and turns meeting notes into owned tasks, so your team spends less time on status and more on delivery.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/signup">Start free</ButtonLink>
              <ButtonLink to="/features" variant="ghost">See features</ButtonLink>
            </div>
            <p className="mt-4 text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>No credit card required.</p>
          </div>
          <div className="lg:col-span-6"><TodayPanel /></div>
        </Container>
      </section>

      <section aria-labelledby="features-title" className="py-16 lg:py-20">
        <Container>
          <SectionHead id="features-title" title="Built for how teams actually work" lead="Every feature removes a step instead of adding one." />
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="rounded-2xl p-5" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
                <Icon size={20} color="#93C5FD" aria-hidden="true" />
                <h3 className="mb-1.5 mt-3 text-[15px] font-semibold">{title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[14px]"><Link to="/features" className="underline underline-offset-4">Explore all features</Link></p>
        </Container>
      </section>

      <section aria-labelledby="how-title" className="py-16 lg:py-20">
        <Container>
          <SectionHead id="how-title" title="From blank project to finished sprint" lead="Five steps, in order." />
          <ol className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="pt-4" style={{ borderTop: "2px solid var(--tf-panel-border)" }}>
                <p className="font-display text-[13px]" style={{ color: "var(--tf-teal)" }}>Step {i + 1}</p>
                <h3 className="mb-1 mt-1 text-[15px] font-semibold">{s.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{s.desc}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="use-title" className="py-16 lg:py-20">
        <Container>
          <SectionHead id="use-title" title="Three things teams do with it every day" />
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {SCENARIOS.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="rounded-2xl p-6" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
                <Icon size={20} color="#5EEAD4" aria-hidden="true" />
                <h3 className="mb-2 mt-3 text-[15px] font-semibold">{title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "#C7D2E3" }}>{desc}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="faq-title" className="py-16 lg:py-20">
        <Container className="max-w-3xl">
          <SectionHead id="faq-title" title="Frequently asked questions" />
          <Faq items={FAQS} />
        </Container>
      </section>

      <section aria-labelledby="cta-title" className="py-16 lg:py-24">
        <Container>
          <div className="rounded-3xl p-8 sm:p-12" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
            <h2 id="cta-title" className="font-display text-[24px] font-semibold sm:text-[30px]">Plan your next sprint with real risk numbers</h2>
            <p className="mt-2 max-w-[52ch] text-[14px]" style={{ color: "var(--tf-ink-muted)" }}>Create a project in minutes. The free plan never expires.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/signup">Start free</ButtonLink>
              <ButtonLink to="/contact" variant="ghost">Talk to sales</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}