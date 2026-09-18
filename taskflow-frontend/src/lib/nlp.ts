import type { Priority } from "../types";
import { TODAY_DAY } from "./calendar";

/**
 * Rule-based natural-language task parsing — deliberately NOT dressed up as
 * an LLM call. It's a deterministic keyword parser: given "fix login bug
 * tomorrow, this is critical", it extracts a priority, a due date, and
 * labels, then returns the remaining text as the title. Real production
 * "AI-generated" text (task descriptions, summaries) should call the
 * OpenAI-backed AiService already built in the taskflow-api backend —
 * this parser is a fast, honest, zero-latency stand-in for the structured
 * extraction part, which genuinely doesn't need an LLM to do well.
 */

const PRIORITY_KEYWORDS: { pattern: RegExp; priority: Priority }[] = [
  { pattern: /\b(critical|urgent|blocker|asap|emergency)\b/i, priority: "Critical" },
  { pattern: /\b(high priority|important|high-priority)\b/i, priority: "High" },
  { pattern: /\b(low priority|minor|someday|whenever|low-priority)\b/i, priority: "Low" },
];

const DUE_KEYWORDS: { pattern: RegExp; resolve: () => number }[] = [
  { pattern: /\btoday\b/i, resolve: () => TODAY_DAY },
  { pattern: /\btomorrow\b/i, resolve: () => TODAY_DAY + 1 },
  { pattern: /\bnext week\b/i, resolve: () => TODAY_DAY + 7 },
];

const EXPLICIT_DATE_PATTERN = /\bon (?:jul(?:y)?\s?)?(\d{1,2})(?:st|nd|rd|th)?\b/i;

const LABEL_KEYWORDS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(bug|fix|broken|crash)\b/i, label: "Bug" },
  { pattern: /\b(test|qa|regression)\b/i, label: "QA" },
  { pattern: /\b(design|wireframe|ux|ui|mockup)\b/i, label: "UX" },
  { pattern: /\b(api|backend|server|auth|database|db)\b/i, label: "Backend" },
  { pattern: /\b(frontend|component|ui)\b/i, label: "Frontend" },
  { pattern: /\b(deploy|release|ship|launch)\b/i, label: "Ops" },
  { pattern: /\b(meeting|sync|call|standup)\b/i, label: "Meeting" },
  { pattern: /\b(ai|prompt|llm|model)\b/i, label: "AI" },
];

export interface ParsedQuickAdd {
  title: string;
  priority: Priority;
  dueDay: number | null;
  labels: string[];
}

export function suggestLabels(text: string): string[] {
  const labels: string[] = [];
  for (const { pattern, label } of LABEL_KEYWORDS) {
    if (pattern.test(text) && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

export function parseQuickAdd(raw: string): ParsedQuickAdd {
  let remaining = raw.trim();
  let priority: Priority = "Medium";
  let dueDay: number | null = null;
  const labels: string[] = [];

  for (const { pattern, priority: p } of PRIORITY_KEYWORDS) {
    if (pattern.test(remaining)) {
      priority = p;
      remaining = remaining.replace(pattern, "").trim();
      break;
    }
  }

  const explicitMatch = remaining.match(EXPLICIT_DATE_PATTERN);
  if (explicitMatch) {
    dueDay = parseInt(explicitMatch[1], 10);
    remaining = remaining.replace(EXPLICIT_DATE_PATTERN, "").trim();
  } else {
    for (const { pattern, resolve } of DUE_KEYWORDS) {
      if (pattern.test(remaining)) {
        dueDay = resolve();
        remaining = remaining.replace(pattern, "").trim();
        break;
      }
    }
  }

  for (const { pattern, label } of LABEL_KEYWORDS) {
    if (pattern.test(remaining) && !labels.includes(label)) labels.push(label);
  }

  // Clean up leftover punctuation/whitespace from stripped keywords ("fix login bug ," -> "fix login bug").
  const title = remaining
    .replace(/\s*,\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { title: title || raw.trim(), priority, dueDay, labels };
}

export function formatDueDay(day: number | null): string {
  if (day === null) return "No due date";
  return `Jul ${day}`;
}
