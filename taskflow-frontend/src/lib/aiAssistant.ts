import type { Task, Meeting } from "../types";
import { TODAY_DAY, findFocusBlocks, formatHour } from "./calendar";

/**
 * Answers are generated from the actual shared task/meeting state — not a
 * fixed lookup table of canned strings. Ask two different questions on two
 * different days (create/complete some tasks first) and the numbers change.
 * This is still pattern-matching on keywords, not a real language model —
 * genuinely understanding open-ended questions would call the OpenAI-backed
 * /api/ai/ask endpoint already built in the taskflow-api backend.
 */
export function answerQuestion(question: string, tasks: Task[], meetings: Meeting[]): string {
  const q = question.toLowerCase();
  const open = tasks.filter((t) => t.column !== "Completed");
  const dueToday = open.filter((t) => t.due === `Jul ${TODAY_DAY}`);
  const atRisk = open.filter((t) => t.atRisk);
  const todaysMeetings = meetings.filter((m) => m.day === TODAY_DAY).sort((a, b) => a.startHour - b.startHour);

  if (/today|priorit|work on/.test(q)) {
    if (dueToday.length === 0) return "Nothing is due today. Good time to pull from Backlog or get ahead on tomorrow's work.";
    const critical = dueToday.filter((t) => t.priority === "Critical");
    const top = critical.length > 0 ? critical : dueToday;
    return `${dueToday.length} task${dueToday.length === 1 ? " is" : "s are"} due today. Start with "${top[0].title}"${top.length > 1 ? ` and "${top[1].title}"` : ""} — ${top[0].priority.toLowerCase()} priority.`;
  }

  if (/risk|danger|slip|behind/.test(q)) {
    if (atRisk.length === 0) return "No tasks are currently flagged at risk. Everything's tracking on schedule.";
    return `${atRisk.length} task${atRisk.length === 1 ? " is" : "s are"} flagged at risk: ${atRisk.map((t) => `"${t.title}"`).join(", ")}.`;
  }

  if (/meeting|schedule|calendar/.test(q)) {
    if (todaysMeetings.length === 0) return "No meetings on your calendar today — good day for focus work.";
    const blocks = findFocusBlocks(todaysMeetings);
    const focusNote = blocks.length > 0 ? ` You have a ${blocks[0].end - blocks[0].start}-hour open block at ${formatHour(blocks[0].start)}.` : "";
    return `${todaysMeetings.length} meeting${todaysMeetings.length === 1 ? "" : "s"} today, starting with "${todaysMeetings[0].title}" at ${formatHour(todaysMeetings[0].startHour)}.${focusNote}`;
  }

  if (/summar|progress|status|how.*going/.test(q)) {
    const completed = tasks.filter((t) => t.column === "Completed").length;
    const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return `${completed} of ${tasks.length} tasks completed (${rate}%). ${open.length} still open, ${atRisk.length} flagged at risk.`;
  }

  return `Here's where things stand: ${open.length} open tasks, ${atRisk.length} at risk, ${todaysMeetings.length} meeting${todaysMeetings.length === 1 ? "" : "s"} today. Ask me about "today", "risk", "meetings", or "progress" for specifics.`;
}

/**
 * A single proactive recommendation for the Dashboard hero, computed from
 * real task state. Returns a genuinely different message depending on what
 * it finds — including an honest "nothing to recommend yet" message for a
 * brand-new account with no tasks, rather than always showing something.
 */
export function computeRecommendation(tasks: Task[]): string {
  const open = tasks.filter((t) => t.column !== "Completed");
  if (tasks.length === 0) {
    return "You don't have any tasks yet — create your first one to get personalized recommendations here.";
  }

  const atRisk = open.filter((t) => t.atRisk);
  if (atRisk.length > 0) {
    return `"${atRisk[0].title}" is flagged at risk${atRisk.length > 1 ? ` (and ${atRisk.length - 1} other${atRisk.length > 2 ? "s" : ""})` : ""} — worth checking before anything else today.`;
  }

  const critical = open.filter((t) => t.priority === "Critical");
  if (critical.length > 0) {
    return `You have ${critical.length} Critical task${critical.length === 1 ? "" : "s"} open. Start with "${critical[0].title}".`;
  }

  if (open.length === 0) {
    return "Everything's marked complete. Good time to plan what's next.";
  }

  return `${open.length} task${open.length === 1 ? " is" : "s are"} open and nothing's flagged urgent — a good day to make steady progress.`;
}

/**
 * A short list of observations for the AI Insights panel, computed from
 * real task and team data. Returns an empty array when there's nothing
 * meaningful to say yet (a new account) — the UI shows an empty state
 * rather than this function inventing filler content.
 */
export function computeInsights(tasks: Task[], members: { initials: string; name: string; workloadPct: number }[]): string[] {
  const insights: string[] = [];
  const open = tasks.filter((t) => t.column !== "Completed");

  const atRisk = open.filter((t) => t.atRisk);
  if (atRisk.length > 0) {
    insights.push(
      `${atRisk.length} task${atRisk.length === 1 ? " is" : "s are"} trending toward a missed deadline — "${atRisk[0].title}" is the most urgent.`
    );
  }

  if (members.length > 1) {
    const sorted = [...members].sort((a, b) => b.workloadPct - a.workloadPct);
    const gap = sorted[0].workloadPct - sorted[sorted.length - 1].workloadPct;
    if (gap >= 30) {
      insights.push(`${sorted[0].name} is carrying noticeably more open work than the rest of the team — consider rebalancing.`);
    }
  }

  const byProject = tasks.reduce<Record<string, { total: number; done: number }>>((acc, t) => {
    acc[t.project] ??= { total: 0, done: 0 };
    acc[t.project].total += 1;
    if (t.column === "Completed") acc[t.project].done += 1;
    return acc;
  }, {});
  const projectEntries = Object.entries(byProject).filter(([, v]) => v.total >= 3);
  const ahead = projectEntries.find(([, v]) => v.done / v.total >= 0.7);
  if (ahead) {
    insights.push(`"${ahead[0]}" is ${Math.round((ahead[1].done / ahead[1].total) * 100)}% complete — pacing well.`);
  }

  return insights;
}
