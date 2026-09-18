import { CalendarClock } from "lucide-react";
import { Avatar, GlassPanel, PriorityBadge } from "../ui/Primitives";
import { useTeam } from "../../context/TeamContext";
import { TODAY_DAY, formatHour, truncateWords } from "../../lib/calendar";
import type { Meeting } from "../../types";

/** Next few meetings from the shared MeetingsContext — reflects live edits made on the Calendar page. */
export function SharedCalendarPreview({ meetings }: { meetings: Meeting[] }) {
  const { members } = useTeam();
  const upcoming = meetings
    .filter((m) => m.day >= TODAY_DAY)
    .sort((a, b) => (a.day !== b.day ? a.day - b.day : a.startHour - b.startHour))
    .slice(0, 4);

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <CalendarClock size={14} color="var(--tf-ink-muted)" />
        <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
          Shared calendar
        </h3>
      </div>
      <div className="flex flex-col gap-3">
        {upcoming.length === 0 && (
          <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>
            Nothing coming up.
          </p>
        )}
        {upcoming.map((m) => {
          const attendeePeople = m.attendees.map((a) => members.find((p) => p.initials === a)).filter(Boolean);
          return (
            <div key={m.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm truncate" style={{ color: "var(--tf-ink)" }}>
                  {truncateWords(m.title)}
                </div>
                <div className="text-xs font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                  Jul {m.day} · {formatHour(m.startHour)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex -space-x-1">
                  {attendeePeople.map((p) => p && <Avatar key={p.initials} initials={p.initials} color={p.color} size={18} />)}
                </div>
                <PriorityBadge priority={m.priority} />
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
