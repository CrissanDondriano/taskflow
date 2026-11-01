import type { Task } from "../types";

/** Real completion history for the last 7 days, computed from each task's
 * `completedAt` timestamp (stamped automatically by TasksContext). Shared
 * between the Dashboard and Reports pages so there's one source of truth. */
export function computeWeeklyTrend(tasks: Task[]) {
  const days: { key: string; day: string; done: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: d.toDateString(), day: d.toLocaleDateString("en-US", { weekday: "short" }), done: 0 });
  }
  tasks.forEach((t) => {
    if (!t.completedAt) return;
    const key = new Date(t.completedAt).toDateString();
    const match = days.find((d) => d.key === key);
    if (match) match.done += 1;
  });
  return days;
}

export type TrendRange = "weekly" | "monthly" | "quarterly";

export interface CompletionPoint {
  label: string;
  /** Tasks created in the bucket (needs `createdAt` — see TasksStore.addTask). */
  created: number;
  /** Tasks completed in the bucket (from `completedAt`). */
  done: number;
}

const DAY_MS = 86_400_000;

/**
 * Created-vs-completed counts per period, bucketed from the real task
 * timestamps. Tasks persisted before `createdAt` existed simply don't
 * contribute to the created series — nothing is invented to fill a gap.
 */
export function computeCompletionSeries(tasks: Task[], range: TrendRange): CompletionPoint[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = todayStart + DAY_MS;

  const buckets: { start: number; end: number; label: string }[] = [];

  if (range === "weekly") {
    // Seven rolling 7-day buckets, oldest first.
    for (let i = 6; i >= 0; i--) {
      const end = tomorrow - i * 7 * DAY_MS;
      buckets.push({ start: end - 7 * DAY_MS, end, label: `W${7 - i}` });
    }
  } else if (range === "monthly") {
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      buckets.push({
        start: start.getTime(),
        end: end.getTime(),
        label: start.toLocaleDateString("en-US", { month: "short" }),
      });
    }
  } else {
    const currentQuarter = Math.floor(now.getMonth() / 3);
    for (let i = 3; i >= 0; i--) {
      const offset = currentQuarter - i;
      const year = now.getFullYear() + Math.floor(offset / 4);
      const quarter = ((offset % 4) + 4) % 4;
      buckets.push({
        start: new Date(year, quarter * 3, 1).getTime(),
        end: new Date(year, quarter * 3 + 3, 1).getTime(),
        label: `Q${quarter + 1}`,
      });
    }
  }

  const series: CompletionPoint[] = buckets.map((b) => ({ label: b.label, created: 0, done: 0 }));

  tasks.forEach((t) => {
    if (t.createdAt) {
      const ts = new Date(t.createdAt).getTime();
      const bucket = buckets.findIndex((b) => ts >= b.start && ts < b.end);
      if (bucket !== -1) series[bucket].created += 1;
    }
    if (t.completedAt) {
      const ts = new Date(t.completedAt).getTime();
      const bucket = buckets.findIndex((b) => ts >= b.start && ts < b.end);
      if (bucket !== -1) series[bucket].done += 1;
    }
  });

  return series;
}

/** Per-project rollup for the Reports page — derived from live tasks, not a separate hardcoded project list. */
export function computeProjectStatus(tasks: Task[]) {
  const byProject = tasks.reduce<Record<string, { total: number; completed: number; atRisk: number }>>((acc, t) => {
    acc[t.project] ??= { total: 0, completed: 0, atRisk: 0 };
    acc[t.project].total += 1;
    if (t.column === "Completed") acc[t.project].completed += 1;
    if (t.atRisk) acc[t.project].atRisk += 1;
    return acc;
  }, {});

  return Object.entries(byProject)
    .map(([name, v]) => ({
      name,
      status: v.completed === v.total ? "Completed" : "Active",
      tasks: v.total,
      completed: v.completed,
      atRisk: v.atRisk,
      progress: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
    }))
    .sort((a, b) => b.tasks - a.tasks);
}
