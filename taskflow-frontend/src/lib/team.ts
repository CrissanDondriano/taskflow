import type { Person, Task } from "../types";

/**
 * Workload is computed relative to whoever currently has the most open
 * (non-Completed) tasks assigned — that person is 100%, everyone else is
 * scaled against them. This replaced a hardcoded workloadPct field that
 * shipped fake numbers for fictional employees; there's no time-tracking
 * or capacity-planning backend to compute a "true" utilization percentage
 * from, so this relative measure is the most honest thing derivable from
 * data the app actually has.
 */
export function withComputedWorkload(members: Person[], tasks: Task[]): Person[] {
  const openCounts = members.map((m) => tasks.filter((t) => t.assignee === m.initials && t.column !== "Completed").length);
  const max = Math.max(1, ...openCounts);
  return members.map((m, i) => ({ ...m, workloadPct: Math.round((openCounts[i] / max) * 100) }));
}
