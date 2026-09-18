import type { Priority, Task } from "../types";
import { TODAY_DAY, dateForDay } from "./calendar";

/**
 * Everything in this file is a deterministic, keyword/rule-based heuristic —
 * not a live model call. It's a genuine, working stand-in for the natural-
 * language parsing and classification a real LLM call (the backend's
 * POST /api/ai/generate-tasks or /api/ai/ask, both already built in
 * taskflow-api) would eventually do. Labeled clearly rather than dressed up
 * as something it isn't, same convention as the rest of this app's mock data.
 */

const PRIORITY_KEYWORDS: [RegExp, Priority][] = [
  [/\b(critical|urgent|asap|blocker)\b/i, "Critical"],
  [/\b(high|important)\b/i, "High"],
  [/\b(low|minor|someday|whenever)\b/i, "Low"],
];

export function detectPriorityFromText(text: string): Priority {
  for (const [pattern, priority] of PRIORITY_KEYWORDS) {
    if (pattern.test(text)) return priority;
  }
  return "Medium";
}

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/\b(api|backend|server|database|auth|endpoint|migration)\b/i, "Backend"],
  [/\b(ui|ux|design|wireframe|frontend|css|layout)\b/i, "UX"],
  [/\b(test|qa|bug|regression|load test)\b/i, "QA"],
  [/\b(ai|prompt|model|llm|assistant)\b/i, "AI"],
  [/\b(integration|webhook|slack|calendar|outlook|oauth)\b/i, "Integrations"],
];

export function suggestLabels(title: string): string[] {
  const matches = CATEGORY_KEYWORDS.filter(([pattern]) => pattern.test(title)).map(([, label]) => label);
  return Array.from(new Set(matches));
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "tomorrow", "friday", "next week" -> a day-of-month within the anchor month (July 2026), relative to TODAY_DAY. */
function detectDueDay(text: string): number | null {
  const lower = text.toLowerCase();
  if (/\btoday\b/.test(lower)) return TODAY_DAY;
  if (/\btomorrow\b/.test(lower)) return TODAY_DAY + 1;
  if (/\bnext week\b/.test(lower)) return TODAY_DAY + 7;

  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(lower)) {
      const todayDate = dateForDay(TODAY_DAY);
      const todayWeekday = todayDate.getDay();
      let delta = i - todayWeekday;
      if (delta <= 0) delta += 7;
      return TODAY_DAY + delta;
    }
  }
  return null;
}

export interface ParsedTask {
  title: string;
  priority: Priority;
  labels: string[];
  dueLabel: string | null;
}

/**
 * "Fix login bug tomorrow high priority #Backend" ->
 * { title: "Fix login bug", priority: "High", labels: ["Backend"], dueLabel: "Jul 3" }
 */
export function parseNaturalLanguageTask(input: string): ParsedTask {
  const priority = detectPriorityFromText(input);
  const dueDay = detectDueDay(input);
  const hashtagLabels = Array.from(input.matchAll(/#(\w+)/g)).map((m) => m[1]);
  const keywordLabels = suggestLabels(input);
  const labels = Array.from(new Set([...hashtagLabels, ...keywordLabels]));

  let title = input
    .replace(/#\w+/g, "")
    .replace(/\b(critical|urgent|asap|blocker|high priority|low priority|high|important|low|minor|someday|whenever)\b/gi, "")
    .replace(/\btomorrow\b|\btoday\b|\bnext week\b/gi, "")
    .replace(new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`, "gi"), "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[,]+$/, "")
    .trim();

  if (title.length > 0) title = title[0].toUpperCase() + title.slice(1);

  return {
    title: title || input.trim(),
    priority,
    labels,
    dueLabel: dueDay && dueDay <= 31 ? `Jul ${dueDay}` : null,
  };
}

export interface DeadlineRisk {
  atRisk: boolean;
  reason: string | null;
}

/**
 * A second, independently-computed risk signal alongside the manual
 * `task.atRisk` flag — this one is derived from checklist pace vs. due-date
 * proximity, the kind of thing a real deadline-prediction model would use
 * as input features.
 */
export function predictDeadlineRisk(task: Task): DeadlineRisk {
  if (task.column === "Completed") return { atRisk: false, reason: null };

  const dueDay = /^Jul (\d{1,2})$/.exec(task.due)?.[1];
  const daysAway = dueDay ? parseInt(dueDay, 10) - TODAY_DAY : null;
  const imminent = daysAway !== null && daysAway <= 1;

  if (!imminent) return { atRisk: false, reason: null };

  if (task.checklist) {
    const pace = task.checklist.done / task.checklist.total;
    if (pace < 0.5) {
      return { atRisk: true, reason: `Checklist only ${Math.round(pace * 100)}% done with the deadline ${daysAway === 0 ? "today" : "tomorrow"}` };
    }
  } else if ((task.priority === "Critical" || task.priority === "High") && (task.column === "Backlog" || task.column === "To Do")) {
    return { atRisk: true, reason: `${task.priority} priority but hasn't started, due ${daysAway === 0 ? "today" : "tomorrow"}` };
  }

  return { atRisk: false, reason: null };
}

export interface BriefingStats {
  dueTodayCount: number;
  atRiskCount: number;
  completionRate: number;
  avgWorkload: number;
  userFirstName: string;
}

/** A templated paragraph built from real numbers — see AiAssistantPanel for where these come from. */
export function generateDailyBriefing(stats: BriefingStats): string {
  const { dueTodayCount, atRiskCount, completionRate, avgWorkload, userFirstName } = stats;
  const parts: string[] = [`Good morning, ${userFirstName}.`];

  if (dueTodayCount > 0) {
    parts.push(`You have ${dueTodayCount} task${dueTodayCount === 1 ? "" : "s"} due today.`);
  } else {
    parts.push("Nothing due today.");
  }

  if (atRiskCount > 0) {
    parts.push(`${atRiskCount} task${atRiskCount === 1 ? "" : "s"} ${atRiskCount === 1 ? "is" : "are"} flagged at risk — worth checking first.`);
  }

  parts.push(`Team completion rate is ${completionRate}%, average workload ${avgWorkload}%.`);

  return parts.join(" ");
}
