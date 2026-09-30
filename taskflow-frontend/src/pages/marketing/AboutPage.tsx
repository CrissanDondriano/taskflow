import { Container, SectionHead, ButtonLink } from "../../components/marketing/Bits";
import { usePageMeta } from "../../hooks/usePageMeta";

export function AboutPage() {
  usePageMeta("About", "Why we built TaskFlow AI: task management that tells you what to do next instead of asking you to update statuses.");
  return (
    <Container className="max-w-3xl py-16 lg:py-24">
      <SectionHead title="Task management that does the reading for you" />
      <div className="flex flex-col gap-5 text-[15px] leading-relaxed" style={{ color: "#C7D2E3" }}>
        <p>Most task tools store work but leave the thinking to you: which task is slipping, who is overloaded, what was decided in Tuesday's meeting.</p>
        <p>TaskFlow AI reads your projects and answers those questions directly. It ranks work by deadline and workload risk, turns meeting notes into owned tasks, and keeps the calendar, board and team view in one place.</p>
        <p>It runs on a Laravel API with a React front end, and every number you see is computed from your real project data.</p>
      </div>
      <div className="mt-10"><ButtonLink to="/signup">Start free</ButtonLink></div>
    </Container>
  );
}
