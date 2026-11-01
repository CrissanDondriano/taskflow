import type { Priority } from "../types";

/**
 * Meeting-notes parsing that runs in the browser.
 *
 * The AI endpoint is the primary extractor, but it needs OPENAI_API_KEY on
 * the server. When it isn't configured (or the call fails) the page would
 * otherwise dead-end on an error, so this module pulls action items out of
 * the notes with plain rules instead. Everything here is derived from the
 * text the user actually pasted — nothing is invented, and the UI labels
 * which extractor produced a result.
 */

export interface ExtractedItem {
  title: string;
  /** Matched member name, or "" when the notes name nobody. */
  owner: string;
  priority: Priority;
  /** ISO yyyy-mm-dd, or null when the notes gave no date. */
  dueDate: string | null;
}

export interface LocalExtraction {
  summary: string;
  actionItems: ExtractedItem[];
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** A line like "Anna: I'll finish the mockups by Friday." */
const SPEAKER_LINE = /^\s*([A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)?)\s*:\s*(.+)$/;

/** Trailing time clauses we lift out of the title and turn into a due date. */
const DUE_PHRASE =
  /\b(?:by|before|on|until|due)\s+(today|tomorrow|next week|(?:the )?end of (?:the )?week|(?:mon|tues|wednes|thurs|fri|satur|sun)day|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2})\b/i;

const BARE_DAY = /\b(today|tomorrow|next week)\b/i;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Resolves "Friday" / "Nov 3" / "tomorrow" to a real calendar date. */
export function resolveDuePhrase(phrase: string, today = new Date()): string | null {
  const clean = phrase.trim().toLowerCase().replace(/\.$/, "");
  const base = startOfDay(today);

  if (clean === "today") return isoDate(base);
  if (clean === "tomorrow") {
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return isoDate(d);
  }
  if (clean === "next week") {
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    return isoDate(d);
  }
  if (/^end of (?:the )?week$/.test(clean)) {
    // The upcoming Friday; if today is already Friday or later, next Friday.
    const d = new Date(base);
    const delta = (5 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (delta === 0 ? 7 : delta));
    return isoDate(d);
  }

  const weekday = WEEKDAYS.indexOf(clean);
  if (weekday !== -1) {
    const d = new Date(base);
    const delta = (weekday - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (delta === 0 ? 7 : delta));
    return isoDate(d);
  }

  const monthDay = clean.match(/^([a-z]{3,9})\.?\s+(\d{1,2})$/);
  if (monthDay) {
    const month = MONTHS.findIndex((m) => m.startsWith(monthDay[1].slice(0, 3)));
    const day = Number(monthDay[2]);
    if (month !== -1 && day >= 1 && day <= 31) {
      const d = new Date(base.getFullYear(), month, day);
      // A month/day already behind us means next year.
      if (d.getTime() < base.getTime()) d.setFullYear(d.getFullYear() + 1);
      return isoDate(d);
    }
  }

  return null;
}

/** Strips a trailing time clause out of a sentence, returning both halves. */
export function splitDuePhrase(sentence: string, today = new Date()): { text: string; dueDate: string | null } {
  const match = sentence.match(DUE_PHRASE) ?? sentence.match(BARE_DAY);
  if (!match) return { text: sentence.trim(), dueDate: null };
  const dueDate = resolveDuePhrase(match[1], today);
  if (!dueDate) return { text: sentence.trim(), dueDate: null };
  const text = (sentence.slice(0, match.index) + " " + sentence.slice((match.index ?? 0) + match[0].length))
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .trim();
  return { text, dueDate };
}

const PRIORITY_RULES: { priority: Priority; pattern: RegExp }[] = [
  { priority: "Critical", pattern: /\b(at risk|block(s|ing|er|ed)?|critical|urgent|asap|escalat\w*)\b/i },
  { priority: "High", pattern: /\b(must|deadline|launch|before|needs? to|has to|have to)\b/i },
  { priority: "Low", pattern: /\b(maybe|sometime|eventually|nice to have|if we can|when there'?s time)\b/i },
];

export function inferPriority(text: string): Priority {
  for (const rule of PRIORITY_RULES) {
    if (rule.pattern.test(text)) return rule.priority;
  }
  return "Medium";
}

const VERB_FOR_STATE: Record<string, string> = {
  done: "Finish",
  finished: "Finish",
  complete: "Finish",
  completed: "Finish",
  ready: "Prepare",
  reviewed: "Review",
  fixed: "Fix",
  updated: "Update",
  sent: "Send",
  shipped: "Ship",
  tested: "Test",
  deployed: "Deploy",
  written: "Write",
  drafted: "Draft",
  decided: "Decide",
};

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "finish the homepage mockups" → "Finish the homepage mockups" */
function sentenceCase(text: string): string {
  const clean = text
    .replace(/^(?:to|that|and|then)\s+/i, "")
    .replace(/\s+/g, " ")
    .replace(/[,.;:]+$/, "")
    .trim();
  return capitalize(clean);
}

/**
 * "Homepage mockups" → "homepage mockups" when the phrase was only
 * capitalised because it started a sentence, but "Pricing API" keeps its
 * capital because its second word is a proper noun too.
 */
function demoteSubject(subject: string): string {
  const words = subject.split(/\s+/);
  if (words.length < 2) return subject;
  if (words[1] !== words[1].toLowerCase()) return subject;
  return subject.charAt(0).toLowerCase() + subject.slice(1);
}

/**
 * Turns one sentence into a task-shaped title. Returns null when the
 * sentence carries no commitment or request — most meeting chatter doesn't.
 */
export function actionTitle(sentence: string): string | null {
  const text = sentence.trim().replace(/^[-*•]\s*/, "");

  // "Pricing API has to be done by Tuesday" → "Finish Pricing API"
  const stateFirst = text.match(/^(.+?)\s+(?:has|have|needs?)\s+to\s+be\s+([a-z]+)\b/i);
  if (stateFirst) {
    const verb = VERB_FOR_STATE[stateFirst[2].toLowerCase()];
    const subject = demoteSubject(stateFirst[1].replace(/^(?:the|a|an)\s+/i, "").trim());
    if (verb && subject) return `${verb} ${subject}`;
  }

  // "Homepage mockups will be ready Friday" → "Prepare homepage mockups"
  const willBe = text.match(/^(.+?)\s+will\s+be\s+([a-z]+)\b/i);
  if (willBe) {
    const verb = VERB_FOR_STATE[willBe[2].toLowerCase()] ?? "Finish";
    const subject = demoteSubject(willBe[1].replace(/^(?:the|a|an)\s+/i, "").trim());
    if (subject) return `${verb} ${subject}`;
  }

  // First-person / inclusive commitments.
  const commitment = text.match(/^(?:i'll|i will|we'll|we will|i'm going to|we're going to|let'?s)\s+(.+)$/i);
  if (commitment) return sentenceCase(commitment[1]);

  // Requests and obligations.
  const obligation = text.match(/^(?:someone|we|they)\s+(?:needs?|has|have)\s+to\s+(.+)$/i);
  if (obligation) return sentenceCase(obligation[1]);

  const request = text.match(/^(?:can|could|would)\s+you\s+(.+)$/i);
  if (request) return sentenceCase(request[1]);

  const modal = text.match(/^(?:we|they|someone)?\s*(?:must|should)\s+(?:be\s+)?(.+)$/i);
  if (modal) return sentenceCase(modal[1]);

  const needs = text.match(/^(?:needs?|has|have)\s+to\s+(.+)$/i);
  if (needs) return sentenceCase(needs[1]);

  return null;
}

/** Distinct speakers named at the start of a line ("Anna: ..."). */
export function detectSpeakers(notes: string): string[] {
  const speakers: string[] = [];
  for (const line of notes.split(/\r?\n/)) {
    const match = line.match(SPEAKER_LINE);
    if (!match) continue;
    const name = match[1].trim();
    if (!speakers.some((s) => s.toLowerCase() === name.toLowerCase())) speakers.push(name);
  }
  return speakers;
}

export function countWords(notes: string): number {
  const trimmed = notes.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Matches "Anna" / "Anna R." against the team's real member names. */
function matchOwner(text: string, speaker: string | null, memberNames: string[]): string {
  const lowered = text.toLowerCase();
  for (const name of memberNames) {
    const first = name.split(" ")[0].toLowerCase();
    if (lowered.includes(name.toLowerCase()) || new RegExp(`\\b${first}\\b`).test(lowered)) return name;
  }
  if (!speaker) return "";
  const bySpeaker = memberNames.find((name) => name.toLowerCase().startsWith(speaker.toLowerCase()));
  return bySpeaker ?? "";
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Rule-based extraction: one action item per sentence that carries a
 * commitment, a request or an obligation, plus a summary built from the
 * notes' most decision-dense sentences.
 */
export function extractLocally(notes: string, memberNames: string[], today = new Date()): LocalExtraction {
  const actionItems: ExtractedItem[] = [];
  const seen = new Set<string>();
  const keySentences: string[] = [];

  for (const rawLine of notes.split(/\r?\n/)) {
    const speakerMatch = rawLine.match(SPEAKER_LINE);
    const speaker = speakerMatch ? speakerMatch[1].trim() : null;
    const body = speakerMatch ? speakerMatch[2] : rawLine;
    if (!body.trim()) continue;

    for (const sentence of splitSentences(body)) {
      const { text, dueDate } = splitDuePhrase(sentence, today);
      const title = actionTitle(text);
      if (title) {
        const key = title.toLowerCase();
        if (key.length >= 4 && key.length <= 120 && !seen.has(key)) {
          seen.add(key);
          actionItems.push({
            title,
            owner: matchOwner(sentence, speaker, memberNames),
            // Priority is read from the whole utterance, not just the
            // action sentence: "The audit is at risk. Someone should
            // review it." carries its urgency in the previous sentence.
            priority: inferPriority(body),
            dueDate,
          });
        }
      }
      if (/\b(at risk|decided|agreed|launch|deadline|block\w*|will|need\w*)\b/i.test(sentence)) {
        keySentences.push(sentence.replace(/\s+/g, " ").trim());
      }
    }
  }

  const summarySentences = keySentences
    .filter((s) => s.length > 24)
    .filter((s, i, all) => all.indexOf(s) === i)
    .slice(0, 3);

  const summary =
    summarySentences.length > 0
      ? summarySentences.join(" ")
      : notes.trim()
        ? notes.trim().replace(/\s+/g, " ").slice(0, 240)
        : "";

  return { summary, actionItems };
}
