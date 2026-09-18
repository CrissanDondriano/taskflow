import { useEffect, useState } from "react";
import { Avatar } from "../ui/Primitives";
import { PRIORITY_HEX } from "../../data/mockData";
import { useTeam } from "../../context/TeamContext";
import { ANCHOR_YEAR, ANCHOR_MONTH, TODAY_DAY, formatWeekdayShort, formatHour, truncateWords } from "../../lib/calendar";
import type { Meeting, DeadlineItem } from "../../types";

const ROW_HEIGHT = 48;
const DISPLAY_START = 7; // 7am
const DISPLAY_END = 20; // 8pm
const HOURS = Array.from({ length: DISPLAY_END - DISPLAY_START }, (_, i) => DISPLAY_START + i);

let draggingMeetingId: string | null = null;

export function TimeGrid({
  days,
  meetings,
  deadlines,
  conflictIds,
  onMoveMeeting,
  onResizeMeeting,
  onSelectMeeting,
  selectedMeetingId,
}: {
  days: Date[];
  meetings: Meeting[];
  deadlines: DeadlineItem[];
  conflictIds: Set<string>;
  onMoveMeeting: (id: string, day: number, startHour: number) => void;
  onResizeMeeting: (id: string, durationHours: number) => void;
  onSelectMeeting: (m: Meeting) => void;
  selectedMeetingId?: string;
}) {
  const { members } = useTeam();
  const [now, setNow] = useState(() => new Date());
  const [resizing, setResizing] = useState<{ id: string; startY: number; initialDuration: number; preview: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    function onMouseMove(e: MouseEvent) {
      setResizing((r) => {
        if (!r) return r;
        const deltaHours = Math.round((e.clientY - r.startY) / ROW_HEIGHT);
        const preview = Math.max(1, Math.min(8, r.initialDuration + deltaHours));
        return { ...r, preview };
      });
    }
    function onMouseUp() {
      setResizing((r) => {
        if (r) onResizeMeeting(r.id, r.preview);
        return null;
      });
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing, onResizeMeeting]);

  const isAnchorDate = (d: Date) => d.getFullYear() === ANCHOR_YEAR && d.getMonth() === ANCHOR_MONTH;
  // The demo's "today" is fixed to July 2, 2026, but the time-of-day shown
  // is the user's real current time — mapped onto that fixed date.
  const currentHourFloat = now.getHours() + now.getMinutes() / 60;
  const nowTop = (currentHourFloat - DISPLAY_START) * ROW_HEIGHT;
  const showNowLine = currentHourFloat >= DISPLAY_START && currentHourFloat <= DISPLAY_END;

  return (
    <div className="overflow-x-auto tf-scroll">
      <div className="min-w-[640px]">
        {/* day headers */}
        <div className="grid sticky top-0 z-20" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, background: "var(--tf-surface)" }}>
          <div />
          {days.map((d) => {
            const inAnchorMonth = isAnchorDate(d);
            const dayNum = d.getDate();
            const dayDeadlines = inAnchorMonth ? deadlines.filter((x) => x.day === dayNum) : [];
            return (
              <div key={d.toISOString()} className="px-1 pb-2 border-b" style={{ borderColor: "var(--tf-panel-border)" }}>
                <div className="text-[10px] font-mono uppercase tracking-wide text-center" style={{ color: "var(--tf-ink-muted)" }}>
                  {formatWeekdayShort(d)}
                </div>
                <div
                  className="text-sm font-display font-semibold text-center mx-auto mt-0.5"
                  style={
                    inAnchorMonth && dayNum === TODAY_DAY
                      ? { color: "#fff", background: "var(--tf-teal)", borderRadius: "9999px", width: 24, height: 24, lineHeight: "24px", boxShadow: "0 0 8px var(--tf-teal)" }
                      : { color: inAnchorMonth ? "var(--tf-ink)" : "var(--tf-ink-muted)" }
                  }
                >
                  {dayNum}
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  {dayDeadlines.map((dl) => (
                    <div
                      key={dl.id}
                      className="text-[9px] font-mono px-1 py-0.5 rounded truncate"
                      style={{ background: `${PRIORITY_HEX[dl.priority]}22`, color: PRIORITY_HEX[dl.priority] }}
                      title={`Deadline: ${dl.title}`}
                    >
                      ⚑ {truncateWords(dl.title)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* time grid body */}
        <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
          {/* sticky hour labels */}
          <div className="sticky left-0" style={{ background: "var(--tf-void)" }}>
            {HOURS.map((h) => (
              <div key={h} className="text-[10px] font-mono text-right pr-2 -translate-y-2" style={{ height: ROW_HEIGHT, color: "var(--tf-ink-muted)" }}>
                {formatHour(h)}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const inAnchorMonth = isAnchorDate(d);
            const dayNum = d.getDate();
            const dayMeetings = inAnchorMonth ? meetings.filter((m) => m.day === dayNum) : [];

            return (
              <div key={d.toISOString()} className="relative" style={{ borderLeft: "1px solid var(--tf-panel-border)" }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggingMeetingId && inAnchorMonth) onMoveMeeting(draggingMeetingId, dayNum, h);
                    }}
                    style={{ height: ROW_HEIGHT, borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  />
                ))}

                {showNowLine && isAnchorDate(d) && dayNum === TODAY_DAY && (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: nowTop }}>
                    <div className="h-px" style={{ background: "var(--tf-danger)" }} />
                    <div className="w-2 h-2 rounded-full -mt-1" style={{ background: "var(--tf-danger)", boxShadow: "0 0 6px var(--tf-danger)" }} />
                  </div>
                )}

                {dayMeetings.map((m) => {
                  const duration = resizing?.id === m.id ? resizing.preview : m.durationHours;
                  const top = (m.startHour - DISPLAY_START) * ROW_HEIGHT;
                  const height = duration * ROW_HEIGHT - 2;
                  const color = PRIORITY_HEX[m.priority];
                  const isConflict = conflictIds.has(m.id);
                  const isSelected = m.id === selectedMeetingId;
                  const attendeePeople = m.attendees.map((a) => members.find((p) => p.initials === a)).filter(Boolean);

                  return (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={() => (draggingMeetingId = m.id)}
                      onDragEnd={() => (draggingMeetingId = null)}
                      onClick={() => onSelectMeeting(m)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && onSelectMeeting(m)}
                      aria-label={`${m.title}, ${formatHour(m.startHour)} to ${formatHour(m.startHour + duration)}${isConflict ? ", conflicts with another meeting" : ""}`}
                      className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden"
                      style={{
                        top,
                        height,
                        background: `${color}22`,
                        border: `1px solid ${isConflict ? "var(--tf-danger)" : color}`,
                        boxShadow: isSelected ? `0 0 0 2px ${color}` : "none",
                      }}
                    >
                      <div className="text-[10px] font-medium leading-tight truncate" style={{ color: "var(--tf-ink)" }}>
                        {isConflict && "⚠ "}
                        {truncateWords(m.title)}
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                        {formatHour(m.startHour)}–{formatHour(m.startHour + duration)}
                      </div>
                      {height > 40 && (
                        <div className="flex -space-x-1 mt-1">
                          {attendeePeople.slice(0, 3).map((p) => p && <Avatar key={p.initials} initials={p.initials} color={p.color} size={14} />)}
                        </div>
                      )}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizing({ id: m.id, startY: e.clientY, initialDuration: m.durationHours, preview: m.durationHours });
                        }}
                        className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize"
                        style={{ background: isSelected ? color : "transparent" }}
                        aria-hidden="true"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
