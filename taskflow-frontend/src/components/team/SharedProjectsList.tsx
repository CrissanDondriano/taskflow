import { FolderKanban } from "lucide-react";
import { GlassPanel } from "../ui/Primitives";
import type { Task } from "../../types";

/** Projects derived from the live task list — no separate hardcoded project list to fall out of sync. */
export function SharedProjectsList({ tasks }: { tasks: Task[] }) {
  const byProject = tasks.reduce<Record<string, { total: number; done: number }>>((acc, t) => {
    acc[t.project] ??= { total: 0, done: 0 };
    acc[t.project].total += 1;
    if (t.column === "Completed") acc[t.project].done += 1;
    return acc;
  }, {});

  const projects = Object.entries(byProject).sort((a, b) => b[1].total - a[1].total);

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <FolderKanban size={14} color="var(--tf-ink-muted)" />
        <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
          Shared projects
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {projects.map(([name, stats], i) => {
          const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
          const color = ["var(--tf-primary)", "var(--tf-warning)", "var(--tf-teal)"][i % 3];
          return (
            <div key={name}>
              <div className="flex justify-between text-[13px] mb-1">
                <span style={{ color: "var(--tf-ink)" }}>{name}</span>
                <span className="font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
