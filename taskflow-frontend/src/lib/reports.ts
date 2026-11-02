import type { Task } from "../types";
import { parseDueDate } from "./taskAdapter";

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

/** Due date (anchored to 2026, same as the board) at the end of that day. */
function dueDeadline(due: string): number | null {
  const iso = parseDueDate(due);
  if (!iso) return null;
  const ts = new Date(`${iso}T23:59:59`).getTime();
  return Number.isNaN(ts) ? null : ts;
}

/** Open tasks whose due date has already passed — the real "at risk right now" count. */
export function isOverdue(task: Task, now: Date = new Date()): boolean {
  if (task.column === "Completed") return false;
  const deadline = dueDeadline(task.due);
  return deadline !== null && deadline < now.getTime();
}

export interface ReportMetrics {
  completedLast30: number;
  /** Percent change vs the previous 30 days; null when there's no prior window to compare. */
  completedDeltaPct: number | null;
  /** Completed-in-window tasks that met their due date, 0–100; null when none had a due date. */
  onTimeRate: number | null;
  /** Average createdAt → completedAt, in days, for tasks completed in the window. */
  avgCompletionDays: number | null;
  /** Open tasks that are past due right now. */
  atRiskNow: number;
}

/**
 * Headline report numbers, all derived from real task timestamps. Every value
 * is nullable rather than defaulted so the UI can say "not enough history"
 * instead of showing an invented figure.
 */
export function computeReportMetrics(tasks: Task[], now: Date = new Date()): ReportMetrics {
  const nowMs = now.getTime();
  const start = nowMs - 30 * DAY_MS;
  const priorStart = nowMs - 60 * DAY_MS;

  const completed = tasks.filter((t) => t.column === "Completed" && t.completedAt);
  const last30 = completed.filter((t) => {
    const ts = new Date(t.completedAt as string).getTime();
    return ts >= start && ts <= nowMs;
  });
  const prior30 = completed.filter((t) => {
    const ts = new Date(t.completedAt as string).getTime();
    return ts >= priorStart && ts < start;
  });

  const deltaPct =
    prior30.length === 0
      ? null
      : Math.round(((last30.length - prior30.length) / prior30.length) * 1000) / 10;

  const withDue = last30.filter((t) => dueDeadline(t.due) !== null);
  const onTime = withDue.filter((t) => {
    const deadline = dueDeadline(t.due) as number;
    return new Date(t.completedAt as string).getTime() <= deadline;
  });

  const withCreated = last30.filter((t) => t.createdAt);
  const totalDays = withCreated.reduce(
    (sum, t) =>
      sum + (new Date(t.completedAt as string).getTime() - new Date(t.createdAt as string).getTime()) / DAY_MS,
    0
  );

  return {
    completedLast30: last30.length,
    completedDeltaPct: deltaPct,
    onTimeRate: withDue.length === 0 ? null : Math.round((onTime.length / withDue.length) * 100),
    avgCompletionDays: withCreated.length === 0 ? null : Math.round((totalDays / withCreated.length) * 10) / 10,
    atRiskNow: tasks.filter((t) => isOverdue(t, now)).length,
  };
}

export type ProjectHealth = "Completed" | "On track" | "Watch" | "At risk";

export interface ProjectReportRow {
  name: string;
  owner: string;
  tasks: number;
  completed: number;
  progress: number;
  status: ProjectHealth;
  /** Earliest open due date (ISO yyyy-mm-dd), or null when nothing is due. */
  due: string | null;
}

/**
 * The Project status table: one row per project with the owner who holds the
 * most tasks, progress, health and the next deadline. `nameFor` resolves an
 * assignee's initials to a display name.
 */
export function computeProjectReport(
  tasks: Task[],
  nameFor: (initials: string) => string = (initials) => initials,
  now: Date = new Date()
): ProjectReportRow[] {
  const grouped = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = t.project || "General";
    grouped.set(key, [...(grouped.get(key) ?? []), t]);
  }

  return Array.from(grouped.entries())
    .map(([name, list]) => {
      const completed = list.filter((t) => t.column === "Completed").length;
      const open = list.filter((t) => t.column !== "Completed");
      const progress = list.length ? Math.round((completed / list.length) * 100) : 0;

      const counts = new Map<string, number>();
      for (const t of list) {
        if (!t.assignee) continue;
        counts.set(t.assignee, (counts.get(t.assignee) ?? 0) + 1);
      }
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];

      const overdue = open.some((t) => isOverdue(t, now));
      const flagged = open.some((t) => t.atRisk);
      let status: ProjectHealth = "On track";
      if (list.length > 0 && completed === list.length) status = "Completed";
      else if (overdue || flagged) status = "At risk";
      else if (progress < 50) status = "Watch";

      const due = open
        .map((t) => parseDueDate(t.due))
        .filter((iso): iso is string => iso !== null)
        .sort()[0] ?? null;

      return { name, owner: top ? nameFor(top[0]) : "Unassigned", tasks: list.length, completed, progress, status, due };
    })
    .sort((a, b) => b.tasks - a.tasks);
}

