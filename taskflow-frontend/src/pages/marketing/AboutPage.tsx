import { MessagesSquare, Clock, ClipboardList, ShieldCheck, Zap, MessageCircleQuestion } from "lucide-react";
import { Container, SectionHead } from "../../components/marketing/Bits";
import { Reveal } from "../../components/marketing/Reveal";
import { PageHero } from "../../components/marketing/PageHero";
import { CtaBand } from "../../components/marketing/Sections";
import { usePageMeta } from "../../hooks/usePageMeta";

const PANEL = { background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" };
const MUTED = { color: "var(--tf-ink-muted)" };
const PROBLEMS = [
  { icon: MessagesSquare, title: "Status lives in meetings and chat", desc: "Progress is scattered across standups, threads and spreadsheets, so someone always has to ask." },
  { icon: Clock, title: "You learn a task is late after it is", desc: "Deadlines slip quietly until they're urgent, and by then the options are gone." },
  { icon: ClipboardList, title: "Meeting notes go nowhere", desc: "Action items get written down once and never become owned tasks." },
];
const VALUES = [
  { icon: MessageCircleQuestion, title: "Answers, not dashboards", desc: "You shouldn't have to read five charts to learn what's slipping. Ask, and get a plain answer." },
  { icon: ShieldCheck, title: "Honest data", desc: "Every number in the app is computed from your real project data. Nothing is made up to look good." },
  { icon: Zap, title: "Fewer steps", desc: "If a feature adds a step without removing two, it doesn't ship." },
];
const BUILT = ["Laravel API", "React and TypeScript", "Real-time updates", "OpenAI-powered assistant"];

export function AboutPage() {
  usePageMeta("About", "Why we built TaskFlow AI: task management that tells you what to do next instead of asking you to update statuses.");
  return (
    <>
      <PageHero title="Task management that does the reading for you" lead="TaskFlow AI exists so teams spend less time on status and more time on the work." />

      <section aria-labelledby="problem" className="py-20 lg:py-28">
        <Container>
          <Reveal><SectionHead id="problem" title="The problem we set out to fix" lead="Most task tools store work but leave the thinking to you." /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {PROBLEMS.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 100} className="h-full">
                  <div className="lift h-full rounded-2xl p-6" style={PANEL}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(248,113,113,0.12)" }}><Icon size={20} color="#F87171" aria-hidden="true" /></span>
                    <h3 className="mb-2 mt-4 text-[16px] font-semibold">{title}</h3>
                    <p className="text-[13px] leading-relaxed" style={MUTED}>{desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="story" className="py-20 lg:py-24" style={{ background: "var(--tf-fill-015)" }}>
        <Container className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className="lg:col-span-5">
            <figure className="m-0 rounded-3xl p-8 sm:p-10" style={{ background: "linear-gradient(160deg,rgba(37,99,235,0.18),rgba(20,184,166,0.1))", border: "1px solid rgba(37,99,235,0.4)" }}>
              <blockquote className="m-0 font-display text-[24px] font-semibold leading-snug text-balance sm:text-[28px]">Tell us what needs doing. We'll tell you what to do first.</blockquote>
              <figcaption className="mt-4 text-[13px]" style={MUTED}>The idea behind TaskFlow AI</figcaption>
            </figure>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-7">
            <h2 id="story" className="font-display text-[26px] font-semibold leading-tight text-balance sm:text-[32px]">How TaskFlow AI works</h2>
            <div className="mt-5 flex max-w-[62ch] flex-col gap-4 text-[15px] leading-relaxed" style={{ color: "var(--tf-ink-soft)" }}>
              <p>TaskFlow AI reads your projects and answers the questions your team keeps asking: which task is slipping, who is overloaded, what was decided in Tuesday's meeting.</p>
              <p>Upload a project plan and it becomes assigned, dated tasks. It ranks work by deadline and workload risk, turns meeting notes into owned tasks, and keeps the calendar, board and team view in one place.</p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section aria-labelledby="values" className="py-20 lg:py-28">
        <Container>
          <Reveal><SectionHead id="values" title="What we believe" /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3">
            {VALUES.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 100} className="h-full">
                  <div className="lift h-full rounded-2xl p-6" style={PANEL}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(20,184,166,0.14)" }}><Icon size={20} color="var(--tf-accent-text)" aria-hidden="true" /></span>
                    <h3 className="mb-2 mt-4 text-[16px] font-semibold">{title}</h3>
                    <p className="text-[13px] leading-relaxed" style={MUTED}>{desc}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="built" className="pb-20 lg:pb-28">
        <Container>
          <Reveal><h2 id="built" className="mb-5 text-[15px] font-medium" style={MUTED}>Built with</h2></Reveal>
          <Reveal delay={80}>
            <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
              {BUILT.map((b) => <li key={b} className="rounded-full px-5 py-2 text-[14px] font-medium" style={PANEL}>{b}</li>)}
            </ul>
          </Reveal>
        </Container>
      </section>
      <CtaBand title="See it on your own project" />
    </>
  );
}