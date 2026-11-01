import { useMemo, type ReactNode } from "react";
import { Activity } from "lucide-react";
import { Avatar, GlassPanel } from "../ui/Primitives";
import { useTeamMembers } from "../../context/TeamContext";
import { timeAgo } from "../../lib/format";
import type { Task } from "../../types";

export function CollaborationTimeline({ tasks }: { tasks: Task[] }) {
  const members = useTeamMembers();
  const colorFor = (initials: string) => members.find((m) => m.initials === initials)?.color ?? "#2563EB";
  const nameFor = (initials: string) => members.find((m) => m.initials === initials)?.name ?? initials;

  const events = useMemo(() => {
    const out: { id: string; initials: string; message: ReactNode; when: string }[] = [];
    for (const t of tasks) {
      if (t.completedAt) {
        out.push({
          id: `${t.id}-done`,
          initials: t.assignee,
          message: (
            <>
              <span className="font-medium" style={{ color: "var(--tf-ink)" }}>{nameFor(t.assignee)}</span>
              {" completed "}
              <span className="font-medium" style={{ color: "var(--tf-ink)" }}>{t.title}</span>
            </>
          ),
          when: t.completedAt,
        });
      }
      if (t.createdAt && t.column !== "Completed") {
        out.push({
          id: `${t.id}-new`,
          initials: t.assignee,
          message: (
            <>
              <span className="font-medium" style={{ color: "var(--tf-ink)" }}>{nameFor(t.assignee)}</span>
              {" started "}
              <span className="font-medium" style={{ color: "var(--tf-ink)" }}>{t.title}</span>
            </>
          ),
          when: t.createdAt,
        });
      }
    }
    return out.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 10);
  }, [tasks, members]);

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <Activity size={14} color="var(--tf-ink-muted)" />
        <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
          Collaboration timeline
        </h2>
      </div>
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8" style={{ color: "var(--tf-ink-muted)" }}>
          <Activity size={20} />
          <p className="text-[13px] text-center">Activity will show up here as your team creates, moves, and completes tasks.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--tf-panel-border)" }}>
          {events.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-3" style={{ borderColor: "var(--tf-panel-border)" }}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar initials={e.initials} color={colorFor(e.initials)} size={28} />
                <div className="text-[13px] min-w-0" style={{ color: "var(--tf-ink-soft)" }}>
                  {e.message}
                </div>
              </div>
              <div className="text-[11px] font-mono shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
                {timeAgo(e.when)}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
