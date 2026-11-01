import { Flag } from "lucide-react";
import { PRIORITY_HEX, PRIORITY_TEXT } from "../../data/mockData";
import { ANCHOR_YEAR, ANCHOR_MONTH, TODAY_DAY, truncateWords } from "../../lib/calendar";
import type { Meeting, DeadlineItem, Priority } from "../../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CellEvent =
  | { kind: "meeting"; id: string; title: string; priority: Priority; hour: number; meeting: Meeting }
  | { kind: "deadline"; id: string; title: string; priority: Priority; hour: number };

/**
 * Month grid. The toolbar (prev/next, month label, add event, view tabs)
 * lives in CalendarPage so every view shares one header; this component is
 * just the grid, with events rendered as inline chips like the reference.
 */
export function MonthView({
  monthOffset,
  selectedDay,
  onSelectDay,
  meetingsByDay,
  deadlinesByDay,
  onSelectMeeting,
}: {
  monthOffset: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  meetingsByDay: Record<number, Meeting[]>;
  deadlinesByDay: Record<number, DeadlineItem[]>;
  onSelectMeeting: (meeting: Meeting) => void;
}) {
  const isAnchorMonth = monthOffset === 0;
  const gridDate = new Date(ANCHOR_YEAR, ANCHOR_MONTH + monthOffset, 1);
  const daysInMonth = new Date(ANCHOR_YEAR, ANCHOR_MONTH + monthOffset + 1, 0).getDate();
  const startOffset = gridDate.getDay();
  const daysInPrevMonth = new Date(ANCHOR_YEAR, ANCHOR_MONTH + monthOffset, 0).getDate();
  const trailing = (7 - ((startOffset + daysInMonth) % 7)) % 7;

  const cells: { day: number; outside: boolean }[] = [
    ...Array.from({ length: startOffset }, (_, i) => ({ day: daysInPrevMonth - startOffset + 1 + i, outside: true })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, outside: false })),
    ...Array.from({ length: trailing }, (_, i) => ({ day: i + 1, outside: true })),
  ];

  const monthLabel = gridDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function eventsFor(day: number, outside: boolean): CellEvent[] {
    if (outside || !isAnchorMonth) return [];
    const meetings: CellEvent[] = (meetingsByDay[day] ?? []).map((m) => ({
      kind: "meeting",
      id: m.id,
      title: m.title,
      priority: m.priority,
      hour: m.startHour,
      meeting: m,
    }));
    const deadlines: CellEvent[] = (deadlinesByDay[day] ?? []).map((d) => ({
      kind: "deadline",
      id: d.id,
      title: d.title,
      priority: d.priority,
      hour: 99,
    }));
    return [...meetings, ...deadlines].sort((a, b) => a.hour - b.hour);
  }

  return (
    <div className="rounded-xl overflow-hidden border-l border-t flex-1 min-h-0 flex flex-col" style={{ borderColor: "var(--tf-panel-border)" }}>
      <div className="grid grid-cols-7 shrink-0">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-r border-b px-1 py-2 text-[9.5px] sm:text-[10px] font-mono uppercase tracking-[0.1em] text-center"
            style={{ borderColor: "var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridAutoRows: "minmax(92px, 1fr)" }}>
        {cells.map((cell, i) => {
          const events = eventsFor(cell.day, cell.outside);
          const isToday = !cell.outside && isAnchorMonth && cell.day === TODAY_DAY;
          const isSelected = !cell.outside && isAnchorMonth && cell.day === selectedDay;
          const visible = events.slice(0, 2);
          const overflow = events.length - visible.length;

          return (
            <div
              key={i}
              className="relative min-h-[92px] border-r border-b p-1.5 overflow-hidden"
              style={{
                borderColor: "var(--tf-panel-border)",
                background: isSelected ? "var(--tf-fill-03)" : "transparent",
                boxShadow: isSelected ? "inset 0 0 0 1px color-mix(in srgb, var(--tf-primary) 55%, transparent)" : undefined,
              }}
            >
              {!cell.outside && (
                <button
                  onClick={() => onSelectDay(cell.day)}
                  aria-label={`${monthLabel} ${cell.day}${events.length ? `, ${events.length} item${events.length === 1 ? "" : "s"}` : ""}`}
                  aria-pressed={isSelected}
                  className="absolute inset-0 z-0 rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--tf-teal)]"
                />
              )}

              <div className="relative z-10 pointer-events-none">
                <div className="flex justify-end">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11.5px] font-mono"
                    style={
                      isToday
                        ? { background: "var(--tf-teal)", color: "#04211d", fontWeight: 600 }
                        : { color: cell.outside ? "var(--tf-ink-muted)" : "var(--tf-ink-soft)", opacity: cell.outside ? 0.45 : 1 }
                    }
                  >
                    {cell.day}
                  </span>
                </div>

                <div className="flex flex-col gap-1 mt-1 pointer-events-auto">
                  {visible.map((ev) => {
                    const hex = PRIORITY_HEX[ev.priority];
                    const chipStyle = {
                      background: `color-mix(in srgb, ${hex} 18%, transparent)`,
                      color: PRIORITY_TEXT[ev.priority],
                    };
                    const label = truncateWords(ev.title, 3, 18);

                    return ev.kind === "meeting" ? (
                      <button
                        key={`m-${ev.id}`}
                        onClick={() => onSelectMeeting(ev.meeting)}
                        title={ev.title}
                        className="text-left text-[10.5px] leading-tight px-1.5 py-1 rounded truncate transition-opacity hover:opacity-80"
                        style={chipStyle}
                      >
                        {label}
                      </button>
                    ) : (
                      <div
                        key={`d-${ev.id}`}
                        title={`Deadline: ${ev.title}`}
                        className="flex items-center gap-1 text-[10.5px] leading-tight px-1.5 py-1 rounded"
                        style={chipStyle}
                      >
                        <Flag size={9} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-[10px] font-mono pl-1" style={{ color: "var(--tf-ink-muted)" }}>
                      +{overflow} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
