import { Avatar, PriorityBadge } from "../ui/Primitives";
import { useTeam } from "../../context/TeamContext";
import type { Task, Priority } from "../../types";

const PRIORITY_ORDER: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/**
 * The actually-usable half of the urgency section. MissionOrbit gives a
 * shape at a glance; this gives a scannable, keyboard-navigable list of the
 * same tasks, sorted by AI-assessed urgency, synced to the same
 * hover/select state so the two views reinforce each other.
 */
export function UrgencyList({
  tasks,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: {
  tasks: Task[];
  selectedId?: string;
  hoveredId?: string;
  onSelect: (task: Task) => void;
  onHover?: (id: string | undefined) => void;
}) {
  const { members } = useTeam();
  const open = tasks
    .filter((t) => t.column !== "Completed")
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  if (open.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--tf-ink-muted)" }}>
        Nothing open — everything's in Completed.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1 max-h-72 overflow-y-auto tf-scroll pr-1">
      {open.map((task) => {
        const person = members.find((p) => p.initials === task.assignee);
        const active = task.id === selectedId || task.id === hoveredId;
        return (
          <button
            key={task.id}
            onClick={() => onSelect(task)}
            onMouseEnter={() => onHover?.(task.id)}
            onMouseLeave={() => onHover?.(undefined)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors"
            style={{ background: active ? "rgba(37,99,235,0.1)" : "transparent" }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--tf-danger)", opacity: task.atRisk ? 1 : 0, boxShadow: task.atRisk ? "0 0 5px var(--tf-danger)" : "none" }} />
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate" style={{ color: "var(--tf-ink)" }}>
                {task.title}
              </div>
              <div className="text-xs font-mono truncate" style={{ color: "var(--tf-ink-muted)" }}>
                {task.project} · due {task.due}
              </div>
            </div>
            <PriorityBadge priority={task.priority} />
            {person && <Avatar initials={person.initials} color={person.color} size={22} />}
          </button>
        );
      })}
    </div>
  );
}
