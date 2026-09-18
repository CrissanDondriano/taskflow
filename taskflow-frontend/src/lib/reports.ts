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
