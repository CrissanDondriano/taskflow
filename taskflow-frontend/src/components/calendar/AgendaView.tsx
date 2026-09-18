import { Clock3, Flag } from "lucide-react";
import { Avatar, GlassPanel, PriorityBadge } from "../ui/Primitives";
import { PRIORITY_HEX } from "../../data/mockData";
import { useTeam } from "../../context/TeamContext";
import { ANCHOR_MONTH, ANCHOR_YEAR, formatHour } from "../../lib/calendar";
import type { Meeting, DeadlineItem } from "../../types";

interface AgendaEntry {
  day: number;
  kind: "meeting" | "deadline";
  data: Meeting | DeadlineItem;
}

export function AgendaView({ meetings, deadlines, conflictIds }: { meetings: Meeting[]; deadlines: DeadlineItem[]; conflictIds: Set<string> }) {
  const { members } = useTeam();
  const entries: AgendaEntry[] = [
    ...meetings.map((m) => ({ day: m.day, kind: "meeting" as const, data: m })),
    ...deadlines.map((d) => ({ day: d.day, kind: "deadline" as const, data: d })),
  ].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    const aHour = a.kind === "meeting" ? (a.data as Meeting).startHour : -1;
    const bHour = b.kind === "meeting" ? (b.data as Meeting).startHour : -1;
    return aHour - bHour;
  });

  const grouped = entries.reduce<Record<number, AgendaEntry[]>>((acc, e) => {
    (acc[e.day] ??= []).push(e);
    return acc;
  }, {});

  const days = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  if (days.length === 0) {
    return (
      <GlassPanel className="p-8 text-center">
        <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>
          Nothing scheduled this month.
        </p>
      </GlassPanel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map((day) => (
        <GlassPanel key={day} className="p-4">
          <h3 className="text-sm font-semibold font-display mb-3" style={{ color: "var(--tf-ink)" }}>
            {new Date(ANCHOR_YEAR, ANCHOR_MONTH, day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </h3>
          <div className="flex flex-col gap-2">
            {grouped[day].map((e, i) => {
              if (e.kind === "meeting") {
                const m = e.data as Meeting;
                const attendeePeople = m.attendees.map((a) => members.find((p) => p.initials === a)).filter(Boolean);
                const isConflict = conflictIds.has(m.id);
                return (
                  <div
                    key={`m-${i}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ border: `1px solid ${isConflict ? "var(--tf-danger)" : "var(--tf-panel-border)"}` }}
                  >
                    <Clock3 size={14} className="shrink-0" color={PRIORITY_HEX[m.priority]} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate" style={{ color: "var(--tf-ink)" }}>
                        {isConflict && "⚠ "}
                        {m.title}
                      </div>
                      <div className="text-xs font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                        {formatHour(m.startHour)}–{formatHour(m.startHour + m.durationHours)}
                      </div>
                    </div>
                    <div className="flex -space-x-1">
                      {attendeePeople.map((p) => p && <Avatar key={p.initials} initials={p.initials} color={p.color} size={20} />)}
                    </div>
                    <PriorityBadge priority={m.priority} />
                  </div>
                );
              }
              const d = e.data as DeadlineItem;
              return (
                <div key={`d-${i}`} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ border: "1px solid var(--tf-panel-border)" }}>
                  <Flag size={14} className="shrink-0" color={PRIORITY_HEX[d.priority]} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate" style={{ color: "var(--tf-ink)" }}>
                      {d.title}
                    </div>
                    <div className="text-xs font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                      Deadline · {d.project}
                    </div>
                  </div>
                  <PriorityBadge priority={d.priority} />
                </div>
              );
            })}
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
