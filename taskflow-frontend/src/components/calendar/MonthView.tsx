import { ChevronLeft, ChevronRight, Flag, Clock3 } from "lucide-react";
import { GlassPanel, PriorityBadge } from "../ui/Primitives";
import { PriorityLegend } from "../ui/PriorityLegend";
import { PRIORITY_HEX } from "../../data/mockData";
import { ANCHOR_YEAR, ANCHOR_MONTH, TODAY_DAY, formatMonthLabel, formatHour } from "../../lib/calendar";
import type { Meeting, DeadlineItem } from "../../types";

const MIN_OFFSET = -1; // June 2026
const MAX_OFFSET = 1; // August 2026

export function MonthView({
  monthOffset,
  onMonthOffsetChange,
  selectedDay,
  onSelectDay,
  meetingsByDay,
  deadlinesByDay,
}: {
  monthOffset: number;
  onMonthOffsetChange: (o: number) => void;
  selectedDay: number;
  onSelectDay: (day: number) => void;
  meetingsByDay: Record<number, Meeting[]>;
  deadlinesByDay: Record<number, DeadlineItem[]>;
}) {
  const isAnchorMonth = monthOffset === 0;
  const gridDate = new Date(ANCHOR_YEAR, ANCHOR_MONTH + monthOffset, 1);
  const daysInMonth = new Date(ANCHOR_YEAR, ANCHOR_MONTH + monthOffset + 1, 0).getDate();
  const startOffset = gridDate.getDay();
  const cells = Array.from({ length: startOffset + daysInMonth }, (_, i) => (i < startOffset ? null : i - startOffset + 1));

  const dayEvents = isAnchorMonth ? [...(meetingsByDay[selectedDay] ?? [])].sort((a, b) => a.startHour - b.startHour) : [];
  const dayDeadlines = isAnchorMonth ? deadlinesByDay[selectedDay] ?? [] : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <GlassPanel className="lg:col-span-2 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            {formatMonthLabel(monthOffset)}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => onMonthOffsetChange(Math.max(MIN_OFFSET, monthOffset - 1))}
              disabled={monthOffset <= MIN_OFFSET}
              aria-label="Previous month"
              className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onMonthOffsetChange(Math.min(MAX_OFFSET, monthOffset + 1))}
              disabled={monthOffset >= MAX_OFFSET}
              aria-label="Next month"
              className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <PriorityLegend className="mb-4" />

        {!isAnchorMonth && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "var(--tf-ink-muted)" }}>
            No demo meetings or deadlines outside July 2026.{" "}
            <button onClick={() => onMonthOffsetChange(0)} className="underline" style={{ color: "var(--tf-teal)" }}>
              Jump back to July
            </button>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono mb-2" style={{ color: "var(--tf-ink-muted)" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            const meetings = day && isAnchorMonth ? meetingsByDay[day] ?? [] : [];
            const deadlines = day && isAnchorMonth ? deadlinesByDay[day] ?? [] : [];
            const combined = [...meetings.map((m) => m.priority), ...deadlines.map((d) => d.priority)];
            const isToday = isAnchorMonth && day === TODAY_DAY;
            const isSelected = isAnchorMonth && day === selectedDay;
            return (
              <button
                key={i}
                disabled={!day || !isAnchorMonth}
                onClick={() => day && onSelectDay(day)}
                aria-label={day ? `${formatMonthLabel(monthOffset)} ${day}${combined.length ? `, ${combined.length} items` : ""}` : undefined}
                className="h-16 rounded-xl text-left p-1.5 flex flex-col justify-between disabled:cursor-default"
                style={{
                  border: `1px solid ${isSelected ? "var(--tf-primary)" : "transparent"}`,
                  background: !day ? "transparent" : isSelected ? "rgba(37,99,235,0.1)" : "rgba(255,255,255,0.02)",
                }}
              >
                {day && (
                  <>
                    <span
                      className="text-xs font-mono flex items-center justify-center"
                      style={
                        isToday
                          ? { color: "#fff", background: "var(--tf-teal)", borderRadius: "9999px", width: 18, height: 18, boxShadow: "0 0 10px var(--tf-teal)" }
                          : { color: "var(--tf-ink-muted)" }
                      }
                    >
                      {day}
                    </span>
                    <div className="flex gap-0.5 flex-wrap">
                      {combined.slice(0, 3).map((p, j) => (
                        <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_HEX[p], boxShadow: `0 0 5px ${PRIORITY_HEX[p]}` }} />
                      ))}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel className="p-5">
        <h3 className="text-sm font-semibold font-display mb-1" style={{ color: "var(--tf-ink)" }}>
          {isAnchorMonth ? `July ${selectedDay}` : "No day selected"}
        </h3>
        <p className="text-xs font-mono mb-4" style={{ color: "var(--tf-ink-muted)" }}>
          {dayEvents.length + dayDeadlines.length} items
        </p>
        <div className="flex flex-col gap-3 max-h-72 overflow-y-auto tf-scroll pr-0.5">
          {dayEvents.map((ev) => (
            <div key={ev.id} className="flex items-start gap-2 rounded-xl p-3" style={{ border: "1px solid var(--tf-panel-border)" }}>
              <Clock3 size={14} className="mt-0.5 shrink-0" color={PRIORITY_HEX[ev.priority]} />
              <div>
                <div className="text-sm font-medium leading-snug" style={{ color: "var(--tf-ink)" }}>
                  {ev.title}
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                  {formatHour(ev.startHour)}–{formatHour(ev.startHour + ev.durationHours)}
                </div>
                <div className="mt-1">
                  <PriorityBadge priority={ev.priority} />
                </div>
              </div>
            </div>
          ))}
          {dayDeadlines.map((d) => (
            <div key={d.id} className="flex items-start gap-2 rounded-xl p-3" style={{ border: "1px solid var(--tf-panel-border)" }}>
              <Flag size={14} className="mt-0.5 shrink-0" color={PRIORITY_HEX[d.priority]} />
              <div>
                <div className="text-sm font-medium leading-snug" style={{ color: "var(--tf-ink)" }}>
                  {d.title}
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                  Deadline · {d.project}
                </div>
                <div className="mt-1">
                  <PriorityBadge priority={d.priority} />
                </div>
              </div>
            </div>
          ))}
          {isAnchorMonth && !dayEvents.length && !dayDeadlines.length && (
            <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>
              Nothing scheduled. Enjoy the quiet.
            </p>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
