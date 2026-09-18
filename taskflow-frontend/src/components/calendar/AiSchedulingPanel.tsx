import { Sparkles, AlertTriangle, Coffee, Users } from "lucide-react";
import { GlassPanel, PulseCard, Eyebrow, Avatar } from "../ui/Primitives";
import { useTeam } from "../../context/TeamContext";
import { findFocusBlocks, findBestMeetingTimes, formatHour, computeSchedulingRecommendation } from "../../lib/calendar";
import type { Meeting } from "../../types";

/**
 * The "AI enhancements" from the brief — suggested focus blocks, conflict
 * detection, and best-available-meeting-time finder — all computed live
 * from the actual meeting list for the selected day, not decorative text.
 */
export function AiSchedulingPanel({ dayMeetings, conflictIds, day }: { dayMeetings: Meeting[]; conflictIds: Set<string>; day: number }) {
  const { members } = useTeam();
  const conflicting = dayMeetings.filter((m) => conflictIds.has(m.id));
  const focusBlocks = findFocusBlocks(dayMeetings);
  const bestTimes = findBestMeetingTimes(
    dayMeetings,
    day,
    members.map((p) => p.initials)
  );

  return (
    <div className="flex flex-col gap-4">
      <PulseCard>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} color="#14B8A6" />
          <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            AI scheduling
          </h3>
        </div>
        <Eyebrow color="#2563EB">Live for the selected day</Eyebrow>
        <p className="text-sm leading-snug mt-2" style={{ color: "#C7D2E3" }}>
          {computeSchedulingRecommendation(conflicting)}
        </p>
      </PulseCard>

      {conflicting.length > 0 && (
        <GlassPanel className="p-4" style={{ borderColor: "rgba(239,68,68,0.35)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={13} color="var(--tf-danger)" />
            <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tf-danger)" }}>
              Conflicts detected
            </h4>
          </div>
          <div className="flex flex-col gap-1.5">
            {conflicting.map((m) => (
              <div key={m.id} className="text-sm" style={{ color: "var(--tf-ink)" }}>
                {m.title}{" "}
                <span className="text-xs font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                  {formatHour(m.startHour)}–{formatHour(m.startHour + m.durationHours)}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      <GlassPanel className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Coffee size={13} color="var(--tf-teal)" />
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
            Suggested focus blocks
          </h4>
        </div>
        {focusBlocks.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--tf-ink-muted)" }}>
            No 2+ hour gaps today — the schedule is packed.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {focusBlocks.map((b, i) => (
              <div key={i} className="text-sm px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(20,184,166,0.08)", border: "1px dashed rgba(20,184,166,0.4)", color: "var(--tf-ink)" }}>
                {formatHour(b.start)}–{formatHour(b.end)}
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      <GlassPanel className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Users size={13} color="#2563EB" />
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
            Best times for the whole team
          </h4>
        </div>
        {bestTimes.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--tf-ink-muted)" }}>
            No shared open slot today — everyone's booked at different times.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {bestTimes.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-sm px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(37,99,235,0.08)" }}>
                <span style={{ color: "var(--tf-ink)" }}>
                  {formatHour(b.start)}–{formatHour(b.end)}
                </span>
                <div className="flex -space-x-1">
                  {members.map((p) => (
                    <Avatar key={p.initials} initials={p.initials} color={p.color} size={18} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
