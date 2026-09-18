import type { Meeting } from "../types";

// This app's fixed "today" throughout — matches "Thursday, July 2, 2026"
// shown elsewhere (e.g. the old dashboard header) and the "Jul 2" due dates
// already used in mock task data.
export const ANCHOR_YEAR = 2026;
export const ANCHOR_MONTH = 6; // July, 0-indexed
export const TODAY_DAY = 2;

export function dateForDay(day: number, month = ANCHOR_MONTH, year = ANCHOR_YEAR): Date {
  return new Date(year, month, day);
}

export function isAnchorMonth(d: Date): boolean {
  return d.getFullYear() === ANCHOR_YEAR && d.getMonth() === ANCHOR_MONTH;
}

/** "Jul 4" -> 4. Any other month, or an unparseable string, returns null. */
export function parseDueToAnchorDay(due: string): number | null {
  const match = due.match(/^Jul (\d{1,2})$/);
  return match ? parseInt(match[1], 10) : null;
}

/** The 7 dates (Sun–Sat) of the week containing the given anchor-month day. */
export function getWeekDates(day: number): Date[] {
  const base = dateForDay(day);
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function formatWeekdayShort(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function formatMonthLabel(monthOffset: number): string {
  const d = new Date(ANCHOR_YEAR, ANCHOR_MONTH + monthOffset, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Returns the id of every meeting that overlaps another meeting on the same day. */
export function detectConflicts(meetings: Meeting[]): Set<string> {
  const conflicted = new Set<string>();
  for (let i = 0; i < meetings.length; i++) {
    for (let j = i + 1; j < meetings.length; j++) {
      const a = meetings[i];
      const b = meetings[j];
      if (a.day !== b.day) continue;
      const aEnd = a.startHour + a.durationHours;
      const bEnd = b.startHour + b.durationHours;
      if (a.startHour < bEnd && b.startHour < aEnd) {
        conflicted.add(a.id);
        conflicted.add(b.id);
      }
    }
  }
  return conflicted;
}

/** Gaps of at least `minGapHours` between meetings on a given day, within working hours. */
export function findFocusBlocks(dayMeetings: Meeting[], workStart = 9, workEnd = 18, minGapHours = 2) {
  const sorted = [...dayMeetings].sort((a, b) => a.startHour - b.startHour);
  const blocks: { start: number; end: number }[] = [];
  let cursor = workStart;
  for (const m of sorted) {
    if (m.startHour > cursor && m.startHour - cursor >= minGapHours) {
      blocks.push({ start: cursor, end: m.startHour });
    }
    cursor = Math.max(cursor, m.startHour + m.durationHours);
  }
  if (workEnd - cursor >= minGapHours) blocks.push({ start: cursor, end: workEnd });
  return blocks;
}

/** Hours within working time where none of the given attendees are booked. */
export function findBestMeetingTimes(meetings: Meeting[], day: number, attendeeInitials: string[], workStart = 9, workEnd = 18) {
  const busyHours = new Set<number>();
  meetings
    .filter((m) => m.day === day && m.attendees.some((a) => attendeeInitials.includes(a)))
    .forEach((m) => {
      for (let h = m.startHour; h < m.startHour + m.durationHours; h++) busyHours.add(h);
    });

  const free: { start: number; end: number }[] = [];
  let blockStart: number | null = null;
  for (let h = workStart; h <= workEnd; h++) {
    const isBoundary = busyHours.has(h) || h === workEnd;
    if (!isBoundary && blockStart === null) blockStart = h;
    if (isBoundary && blockStart !== null) {
      if (h - blockStart >= 1) free.push({ start: blockStart, end: h });
      blockStart = null;
    }
  }
  return free;
}

export function formatHour(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  return `${h}${hour < 12 || hour === 24 ? "am" : "pm"}`;
}

/** A one-line scheduling recommendation computed from real conflicts for the day — no canned text. */
export function computeSchedulingRecommendation(conflicting: Meeting[]): string {
  if (conflicting.length === 0) {
    return "No scheduling conflicts today — your calendar looks clear.";
  }
  const [a, b] = conflicting;
  if (b) {
    return `"${a.title}" and "${b.title}" overlap today — move one before your day starts.`;
  }
  return `"${a.title}" overlaps with another meeting today — worth resolving before it starts.`;
}

/** Caps a title to a maximum word count AND character length for tight
 * preview spaces (calendar chips, mini cards). Word count alone isn't
 * enough — "Load test task-generation endpoint" is exactly 4 words but
 * still too long to fit a narrow week-view column without wrapping or
 * clipping mid-letter, so a character ceiling is enforced too. */
export function truncateWords(text: string, maxWords = 4, maxChars = 26): string {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  let result = words.length > maxWords ? words.slice(0, maxWords).join(" ") : trimmed;
  let wasCut = words.length > maxWords;

  if (result.length > maxChars) {
    result = result.slice(0, maxChars).trimEnd();
    wasCut = true;
  }

  return wasCut ? `${result}…` : result;
}

/**
 * Whether a person has a meeting right now, using the real current
 * hour-of-day mapped onto the app's fixed "today" (see TimeGrid's
 * current-time indicator for the same convention). Genuinely computed from
 * the shared meetings list — not a mock presence flag.
 */
export function isPersonBusyNow(initials: string, meetings: Meeting[]): Meeting | null {
  const hour = new Date().getHours();
  const todays = meetings.filter((m) => m.day === TODAY_DAY && m.attendees.includes(initials));
  return todays.find((m) => hour >= m.startHour && hour < m.startHour + m.durationHours) ?? null;
}

/** The next hour today (from now) at which this person has no meeting, within working hours. */
export function nextFreeHour(initials: string, meetings: Meeting[], workEnd = 18): number | null {
  let hour = new Date().getHours();
  const todays = meetings.filter((m) => m.day === TODAY_DAY && m.attendees.includes(initials));
  while (hour < workEnd) {
    const busy = todays.some((m) => hour >= m.startHour && hour < m.startHour + m.durationHours);
    if (!busy) return hour;
    hour++;
  }
  return null;
}
