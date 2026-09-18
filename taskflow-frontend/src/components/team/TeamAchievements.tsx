import { Trophy, Flame, ShieldCheck } from "lucide-react";
import { GlassPanel } from "../ui/Primitives";
import type { Task } from "../../types";

/**
 * Achievement badges: the completed-task count and zero-overdue streak are
 * computed from real task state; the "on a roll" streak badge is
 * illustrative gamification copy (there's no real streak-tracking data
 * source yet) and is labeled as such below.
 */
export function TeamAchievements({ tasks }: { tasks: Task[] }) {
  const completed = tasks.filter((t) => t.column === "Completed").length;
  const atRisk = tasks.filter((t) => t.atRisk).length;

  const badges = [
    { icon: Trophy, label: `${completed} tasks shipped`, color: "#F59E0B", real: true },
    { icon: ShieldCheck, label: atRisk === 0 ? "Zero at-risk tasks" : `${atRisk} task${atRisk === 1 ? "" : "s"} need attention`, color: atRisk === 0 ? "#22C55E" : "#EF4444", real: true },
    { icon: Flame, label: "4-day completion streak", color: "#EF4444", real: false },
  ];

  return (
    <GlassPanel className="p-5">
      <h3 className="text-sm font-semibold font-display mb-4" style={{ color: "var(--tf-ink)" }}>
        Team achievements
      </h3>
      <div className="flex flex-col gap-3">
        {badges.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.label} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${b.color}22` }}>
                <Icon size={15} color={b.color} />
              </div>
              <span className="text-sm" style={{ color: "var(--tf-ink)" }}>
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] font-mono mt-4" style={{ color: "var(--tf-ink-muted)" }}>
        First two computed from live tasks · streak badge is illustrative
      </p>
    </GlassPanel>
  );
}
