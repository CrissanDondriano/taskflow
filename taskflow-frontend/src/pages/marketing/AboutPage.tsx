import { MessageCircleQuestion, ShieldCheck, Zap } from "lucide-react";
import { Container, SectionHead } from "../../components/marketing/Bits";
import { Reveal } from "../../components/marketing/Reveal";
import { PageHero } from "../../components/marketing/PageHero";
import { CtaBand } from "../../components/marketing/Sections";
import { usePageMeta } from "../../hooks/usePageMeta";

const VALUES = [
  { icon: MessageCircleQuestion, title: "Answers, not dashboards", desc: "You shouldn't have to read five charts to learn what's slipping. Ask, and get a plain answer." },
  { icon: ShieldCheck, title: "Honest data", desc: "Every number in the app is computed from your real project data. Nothing is made up to look good." },
  { icon: Zap, title: "Fewer steps", desc: "If a feature adds a step without removing two, it doesn't ship." },
];

export function AboutPage() {
  usePageMeta("About", "Why we built TaskFlow AI: task management that tells you what to do next instead of asking you to update statuses.");
  return (
    <>
      <PageHero title="Task management that does the reading for you" lead="TaskFlow AI exists so teams spend less time on status and more time on the work." />

      <section aria-labelledby="story" className="py-20 lg:py-28">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5"><h2 id="story" className="font-display text-[26px] font-semibold leading-tight text-balance sm:text-[32px]">Why we built it</h2></Reveal>
          <Reveal delay={100} className="lg:col-span-7">
            <div className="flex max-w-[62ch] flex-col gap-5 text-[15px] leading-relaxed" style={{ color: "#C7D2E3" }}>
              <p>Most task tools store work but leave the thinking to you: which task is slipping, who is overloaded, what was decided in Tuesday's meeting.</p>
              <p>TaskFlow AI reads your projects and answers those questions directly. It ranks work by deadline and workload risk, turns meeting notes into owned tasks, and keeps the calendar, board and team view in one place.</p>
              <p>It runs on a Laravel API with a React front end.</p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section aria-labelledby="values" className="py-20 lg:py-24" style={{ background: "rgba(255,255,255,0.015)" }}>
        <Container>
          <Reveal><SectionHead id="values" title="What we believe" /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 100} className="h-full">
                  <div className="lift h-full rounded-2xl p-6" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(20,184,166,0.14)" }}><Icon size={20} color="#5EEAD4" aria-hidden="true" /></span>
                    <h3 className="mb-2 mt-4 text-[16px] font-semibold">{title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <CtaBand title="See it on your own project" />
    </>
  );
}