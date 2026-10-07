import { Check } from "lucide-react";
import { Container, SectionHead, ButtonLink } from "../../components/marketing/Bits";
import { Reveal } from "../../components/marketing/Reveal";
import { PageHero } from "../../components/marketing/PageHero";
import { ChatVisual, RiskVisual, BarsVisual } from "../../components/marketing/Visuals";
import { CtaBand } from "../../components/marketing/Sections";
import { usePageMeta } from "../../hooks/usePageMeta";
import { FEATURES, SCENARIOS } from "../../data/marketing";

const ROWS = [
  { title: "Ask your projects anything", desc: "The assistant answers from your live tasks, deadlines and assignees, so \"what should I work on today?\" gets a real answer.", points: ["Daily priorities in plain language", "Project summaries on demand"], visual: <ChatVisual /> },
  { title: "See risk before it's late", desc: "Every task and project is scored for deadline and workload risk. The work that needs attention rises to the top.", points: ["Automatic risk scoring", "Alerts before deadlines slip"], visual: <RiskVisual /> },
  { title: "Reports that are already written", desc: "Completion trends, workload balance and project health update as work happens.", points: ["Live analytics dashboard", "Workload balance across the team"], visual: <BarsVisual /> },
] as const;
const PANEL = { background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" };

export function FeaturesPage() {
  usePageMeta("Features", "AI task assistant, smart scheduling, risk detection, team collaboration, analytics and integrations in one workspace.");
  return (
    <>
      <PageHero title="Everything your team needs to plan and deliver" lead="One workspace for tasks, calendar, people and AI insight.">
        <ButtonLink to="/signup">Start free</ButtonLink>
      </PageHero>

      <section aria-label="Feature highlights" className="py-20 lg:py-28">
        <Container className="flex flex-col gap-20 lg:gap-28">
          {ROWS.map((r, i) => (
            <div key={r.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <Reveal className={i % 2 ? "lg:order-2" : ""}>
                <h2 className="font-display text-[26px] font-semibold leading-tight text-balance sm:text-[32px]">{r.title}</h2>
                <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{r.desc}</p>
                <ul className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0">
                  {r.points.map((p) => <li key={p} className="flex items-center gap-2.5 text-[14px]"><Check size={16} color="#14B8A6" aria-hidden="true" />{p}</li>)}
                </ul>
              </Reveal>
              <Reveal delay={120}>{r.visual}</Reveal>
            </div>
          ))}
        </Container>
      </section>

      <section aria-labelledby="all-features" className="py-20 lg:py-24" style={{ background: "var(--tf-fill-015)" }}>
        <Container>
          <Reveal><SectionHead id="all-features" title="All features" /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 70} className="h-full">
                  <div className="lift h-full rounded-2xl p-6" style={PANEL}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(37,99,235,0.14)" }}><Icon size={20} color="var(--tf-info-text)" aria-hidden="true" /></span>
                    <h3 className="mb-2 mt-4 text-[16px] font-semibold">{title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="use-cases" className="py-20 lg:py-28">
        <Container>
          <Reveal><SectionHead id="use-cases" title="How teams use it" /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {SCENARIOS.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 100} className="h-full">
                  <div className="lift h-full rounded-2xl p-6" style={PANEL}>
                    <Icon size={22} color="var(--tf-accent-text)" aria-hidden="true" />
                    <h3 className="mb-2 mt-3 text-[16px] font-semibold">{title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-soft)" }}>{desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}