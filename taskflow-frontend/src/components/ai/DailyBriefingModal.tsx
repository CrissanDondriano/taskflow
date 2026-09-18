import { Sparkles, CheckCircle2, AlertTriangle, CalendarClock, Coffee } from "lucide-react";
import { Modal, PriorityBadge } from "../ui/Primitives";
import { TODAY_DAY, findFocusBlocks, formatHour } from "../../lib/calendar";
import type { Task, Meeting } from "../../types";

/**
 * A daily briefing assembled entirely from real, live state — tasks due
 * today, at-risk items, today's meetings, and a computed focus-block
 * suggestion. Nothing here is a canned paragraph; every line is derived at
 * render time from TasksContext/MeetingsContext.
 */
export function DailyBriefingModal({ open, onClose, tasks, meetings }: { open: boolean; onClose: () => void; tasks: Task[]; meetings: Meeting[] }) {
  const dueToday = tasks.filter((t) => t.due === `Jul ${TODAY_DAY}` && t.column !== "Completed");
  const atRisk = tasks.filter((t) => t.atRisk);
  const todaysMeetings = meetings.filter((m) => m.day === TODAY_DAY).sort((a, b) => a.startHour - b.startHour);
  const focusBlocks = findFocusBlocks(todaysMeetings);
  const topPriority = [...dueToday].sort((a, b) => (a.priority === "Critical" ? -1 : b.priority === "Critical" ? 1 : 0))[0];

  return (
    <Modal open={open} onClose={onClose} title="Daily briefing">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)" }}>
          <Sparkles size={15} className="mt-0.5 shrink-0" color="#93C5FD" />
          <p className="text-sm leading-snug" style={{ color: "#C7D2E3" }}>
            {topPriority
              ? `Start with "${topPriority.title}" (${topPriority.priority.toLowerCase()} priority, due today).`
              : "Nothing urgent due today — a good day to make progress on Backlog items."}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={13} style={{ color: "var(--tf-ink-muted)" }} />
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
              Due today ({dueToday.length})
            </h4>
          </div>
          {dueToday.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>Nothing due today.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {dueToday.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--tf-ink)" }}>{t.title}</span>
                  <PriorityBadge priority={t.priority} />
                </div>
              ))}
            </div>
          )}
        </div>

        {atRisk.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={13} color="var(--tf-danger)" />
              <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tf-danger)" }}>
                At risk ({atRisk.length})
              </h4>
            </div>
            <div className="flex flex-col gap-1">
              {atRisk.map((t) => (
                <div key={t.id} className="text-sm" style={{ color: "var(--tf-ink)" }}>
                  {t.title}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarClock size={13} style={{ color: "var(--tf-ink-muted)" }} />
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
              Today's meetings ({todaysMeetings.length})
            </h4>
          </div>
          {todaysMeetings.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>No meetings today.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {todaysMeetings.map((m) => (
                <div key={m.id} className="text-sm" style={{ color: "var(--tf-ink)" }}>
                  {formatHour(m.startHour)} — {m.title}
                </div>
              ))}
            </div>
          )}
        </div>

        {focusBlocks.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(20,184,166,0.08)", border: "1px dashed rgba(20,184,166,0.4)" }}>
            <Coffee size={13} color="var(--tf-teal)" />
            <span className="text-sm" style={{ color: "var(--tf-ink)" }}>
              Suggested focus block: {formatHour(focusBlocks[0].start)}–{formatHour(focusBlocks[0].end)}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
