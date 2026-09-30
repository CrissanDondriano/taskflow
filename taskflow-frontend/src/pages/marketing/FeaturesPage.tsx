import { Container, SectionHead, ButtonLink } from "../../components/marketing/Bits";
import { usePageMeta } from "../../hooks/usePageMeta";
import { FEATURES, SCENARIOS } from "../../data/marketing";

export function FeaturesPage() {
  usePageMeta("Features", "AI task assistant, smart scheduling, team collaboration, analytics, automation and integrations in one workspace.");
  return (
    <Container className="py-16 lg:py-24">
      <SectionHead title="Everything your team needs to plan and deliver" lead="One workspace for tasks, calendar, people and AI insight." />
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="rounded-2xl p-6" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
            <Icon size={20} color="#93C5FD" aria-hidden="true" />
            <h2 className="mb-2 mt-3 text-[16px] font-semibold">{title}</h2>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p>
          </li>
        ))}
      </ul>
      <h2 className="mb-6 mt-20 font-display text-[24px] font-semibold">How teams use it</h2>
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
        {SCENARIOS.map(({ title, desc }) => (
          <li key={title} className="rounded-2xl p-6" style={{ border: "1px solid var(--tf-panel-border)" }}>
            <h3 className="mb-2 text-[15px] font-semibold">{title}</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p>
          </li>
        ))}
      </ul>
      <div className="mt-12"><ButtonLink to="/signup">Start free</ButtonLink></div>
    </Container>
  );
}
