import { Mail, MoreVertical, X } from "lucide-react";
import { Avatar, GlassPanel } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { CircularGauge } from "../ui/CircularGauge";
import { DropdownMenu } from "../ui/DropdownMenu";
import { useMeetings } from "../../context/MeetingsContext";
import { isPersonBusyNow, nextFreeHour, formatHour } from "../../lib/calendar";
import type { Person } from "../../types";

const STATUS_COLOR: Record<Person["status"], string> = {
  online: "var(--tf-success)",
  away: "var(--tf-warning)",
  offline: "var(--tf-ink-muted)",
};

export function MemberCard({
  person,
  assignedCount,
  completedCount,
  onRemove,
}: {
  person: Person;
  assignedCount: number;
  completedCount: number;
  onRemove: () => void;
}) {
  const { meetings } = useMeetings();
  const currentMeeting = isPersonBusyNow(person.initials, meetings);
  const freeAt = currentMeeting ? nextFreeHour(person.initials, meetings) : null;

  return (
    <GlassPanel className="p-4 relative">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar initials={person.initials} color={person.color} size={40} />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{ background: STATUS_COLOR[person.status], border: "2px solid var(--tf-surface)" }}
              title={person.status}
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: "var(--tf-ink)" }}>
              {person.name}
            </div>
            <div className="text-xs truncate" style={{ color: "var(--tf-ink-muted)" }}>
              {person.jobTitle}
            </div>
          </div>
        </div>

        <DropdownMenu
          trigger={
            <button aria-label={`Actions for ${person.name}`} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--tf-ink-muted)" }}>
              <MoreVertical size={15} />
            </button>
          }
          groups={[{ items: [{ label: "Remove from team", icon: <X size={13} />, onSelect: onRemove, danger: true }] }]}
        />
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        <Badge color={person.color}>{person.department}</Badge>
        <span className="text-xs" style={{ color: currentMeeting ? "var(--tf-warning)" : "var(--tf-ink-muted)" }}>
          {currentMeeting ? `In "${currentMeeting.title}"${freeAt !== null ? ` until ${formatHour(freeAt)}` : ""}` : "Available now"}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "var(--tf-ink-muted)" }}>
        <Mail size={12} /> <span className="truncate">{person.email}</span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
            Tasks
          </div>
          <div className="text-sm font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            {completedCount}/{assignedCount} done
          </div>
        </div>
        <CircularGauge value={person.workloadPct} size={52} strokeWidth={5} color={person.color} sublabel="load" />
      </div>
    </GlassPanel>
  );
}
