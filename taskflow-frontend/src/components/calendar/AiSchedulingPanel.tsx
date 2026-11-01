import { useState } from "react";
import { Sparkles, Coffee, Users, AlertTriangle, RotateCcw } from "lucide-react";
import { useTeamMembers } from "../../context/TeamContext";
import {
  findFocusBlocks,
  findBestMeetingTimes,
  formatHour,
  computeSchedulingRecommendation,
  ANCHOR_YEAR,
  ANCHOR_MONTH,
  TODAY_DAY,
} from "../../lib/calendar";
import type { Meeting } from "../../types";

/** First slot on the day where a meeting of `hours` fits without overlapping. */
function firstFreeSlot(dayMeetings: Meeting[], hours: number, workStart = 9, workEnd = 18): number | null {
  const busy = new Set<number>();
  dayMeetings.forEach((m) => {
    for (let h = m.startHour; h < m.startHour + m.durationHours; h++) busy.add(h);
  });
  for (let h = workStart; h + hours <= workEnd; h++) {
    let fits = true;
    for (let k = 0; k < hours; k++) {
      if (busy.has(h + k)) {
        fits = false;
        break;
      }
    }
    if (fits) return h;
  }
  return null;
}

const cardStyle = { background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" };

/**
 * The "AI enhancements" from the brief — suggested focus blocks, conflict
 * detection, and best-available-meeting-time finder — all computed live
 * from the actual meeting list for the selected day, not decorative text.
 */
export function AiSchedulingPanel({
  dayMeetings,
  conflictIds,
  day,
  onReschedule,
}: {
  dayMeetings: Meeting[];
  conflictIds: Set<string>;
  day: number;
  onReschedule: (id: string, startHour: number) => void;
}) {
  const members = useTeamMembers();
  const [dismissed, setDismissed] = useState(false);

  const conflicting = dayMeetings.filter((m) => conflictIds.has(m.id));
  const focusBlocks = findFocusBlocks(dayMeetings);
  const bestTimes = findBestMeetingTimes(
    dayMeetings,
    day,
    members.map((p) => p.initials)
  );

  // The second half of the first overlapping pair is the one we move.
  const moveTarget = conflicting[1] ?? null;
  const targetSlot = moveTarget ? firstFreeSlot(dayMeetings, moveTarget.durationHours) : null;
  const canReschedule = !!moveTarget && targetSlot !== null;

  const dateLabel = new Date(ANCHOR_YEAR, ANCHOR_MONTH, day)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      {!dismissed ? (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "color-mix(in srgb, var(--tf-teal) 8%, var(--tf-surface))",
            border: "1px solid color-mix(in srgb, var(--tf-teal) 45%, transparent)",
            boxShadow: "0 0 26px color-mix(in srgb, var(--tf-teal) 10%, transparent)",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={15} style={{ color: "var(--tf-teal)" }} aria-hidden="true" />
            <h2 className="text-[14px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              AI scheduling
            </h2>
          </div>
          <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--tf-teal)" }}>
            Live for {day === TODAY_DAY ? "today" : "the selected day"} · {dateLabel}
          </p>
          <p className="text-[12.5px] leading-relaxed mt-2.5" style={{ color: "var(--tf-ink-soft)" }}>
            {computeSchedulingRecommendation(conflicting)}
          </p>

          {conflicting.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-1">
              {conflicting.map((m) => (
                <li key={m.id} className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--tf-danger-text)" }}>
                  <AlertTriangle size={11} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{m.title}</span>
                  <span className="font-mono shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
                    {formatHour(m.startHour)}–{formatHour(m.startHour + m.durationHours)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2 mt-3.5">
            <button
              onClick={() => {
                if (moveTarget && targetSlot !== null) onReschedule(moveTarget.id, targetSlot);
              }}
              disabled={!canReschedule}
              title={canReschedule ? `Move "${moveTarget?.title}" to ${formatHour(targetSlot ?? 0)}` : "No conflict to reschedule"}
              className="h-8 px-3 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--tf-primary)", color: "#fff" }}
            >
              Reschedule
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="h-8 px-3 rounded-lg text-[12px] font-medium transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-soft)" }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setDismissed(false)}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-medium self-start transition-colors hover:bg-white/5"
          style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
        >
          <RotateCcw size={12} aria-hidden="true" /> Show AI scheduling
        </button>
      )}

      <div className="rounded-2xl p-4" style={cardStyle}>
        <h3 className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--tf-ink-muted)" }}>
          <Coffee size={12} aria-hidden="true" style={{ color: "var(--tf-teal)" }} />
          Suggested focus blocks
        </h3>
        {focusBlocks.length === 0 ? (
          <p className="text-[12px] mt-2.5" style={{ color: "var(--tf-ink-muted)" }}>
            No 2+ hour gaps today — the schedule is packed.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {focusBlocks.map((b, i) => (
              <div
                key={i}
                className="text-[12.5px] px-3 py-2 rounded-lg"
                style={{ border: "1px dashed color-mix(in srgb, var(--tf-teal) 55%, transparent)", color: "var(--tf-ink)" }}
              >
                {formatHour(b.start)} – {formatHour(b.end)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl p-4" style={cardStyle}>
        <h3 className="flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--tf-ink-muted)" }}>
          <Users size={12} aria-hidden="true" style={{ color: "var(--tf-primary)" }} />
          Best times for the whole team
        </h3>
        {bestTimes.length === 0 ? (
          <p className="text-[12px] mt-2.5" style={{ color: "var(--tf-ink-muted)" }}>
            No shared open slot today — everyone's booked at different times.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {bestTimes.map((b, i) => (
              <div
                key={i}
                className="text-[12.5px] px-3 py-2 rounded-lg"
                style={{ border: "1px dashed color-mix(in srgb, var(--tf-teal) 55%, transparent)", color: "var(--tf-ink)" }}
              >
                {formatHour(b.start)} – {formatHour(b.end)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
