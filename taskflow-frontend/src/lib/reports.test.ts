import { describe, expect, it } from "vitest";
import {
  computeCompletionSeries,
  computeProjectReport,
  computeProjectStatus,
  computeReportMetrics,
  computeWeeklyTrend,
  isOverdue,
} from "./reports";
import type { Task } from "../types";

function task(patch: Partial<Task>): Task {
  return {
    id: "t1",
    title: "T",
    project: "General",
    priority: "Medium",
    assignee: "",
    due: "No due date",
    column: "To Do",
    ...patch,
  };
}

describe("computeWeeklyTrend", () => {
  it("returns the last 7 days with completions counted per day", () => {
    const trend = computeWeeklyTrend([
      task({ column: "Completed", completedAt: new Date().toISOString() }),
      task({ column: "Completed", completedAt: new Date().toISOString() }),
    ]);
    expect(trend).toHaveLength(7);
    expect(trend[6].done).toBe(2);
    expect(trend[0].done).toBe(0);
  });

  it("ignores tasks without a completion timestamp", () => {
    const trend = computeWeeklyTrend([task({ column: "Completed" })]);
    expect(trend.every((d) => d.done === 0)).toBe(true);
  });
});

describe("computeCompletionSeries", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  it("buckets created and completed tasks into seven weekly points", () => {
    const series = computeCompletionSeries(
      [
        task({ createdAt: daysAgo(0) }),
        task({ createdAt: daysAgo(10) }),
        task({ column: "Completed", createdAt: daysAgo(40), completedAt: daysAgo(1) }),
      ],
      "weekly"
    );
    expect(series).toHaveLength(7);
    expect(series[6].created).toBe(1); // created today
    expect(series[6].done).toBe(1); // completed yesterday
    expect(series[5].created).toBe(1); // created ten days ago
    expect(series[1].created).toBe(1); // created forty days ago
  });

  it("never invents creation history for tasks persisted before createdAt existed", () => {
    const series = computeCompletionSeries([task({})], "weekly");
    expect(series.every((p) => p.created === 0)).toBe(true);
  });

  it("returns six monthly and four quarterly buckets, newest last", () => {
    const monthly = computeCompletionSeries([], "monthly");
    const quarterly = computeCompletionSeries([], "quarterly");
    expect(monthly).toHaveLength(6);
    expect(quarterly).toHaveLength(4);
    expect(quarterly[3].label).toBe(`Q${Math.floor(new Date().getMonth() / 3) + 1}`);
  });
});

describe("computeProjectStatus", () => {
  it("rolls tasks up per project with progress and status", () => {
    const rows = computeProjectStatus([
      task({ project: "General", column: "Completed" }),
      task({ project: "General" }),
      task({ project: "Other", atRisk: true }),
    ]);
    expect(rows).toEqual([
      { name: "General", status: "Active", tasks: 2, completed: 1, atRisk: 0, progress: 50 },
      { name: "Other", status: "Active", tasks: 1, completed: 0, atRisk: 1, progress: 0 },
    ]);
  });

  it("marks fully completed projects as Completed", () => {
    const rows = computeProjectStatus([task({ column: "Completed" })]);
    expect(rows[0].status).toBe("Completed");
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-11-02T12:00:00");

  it("is true only for open tasks whose due day has passed", () => {
    expect(isOverdue(task({ due: "Nov 1" }), now)).toBe(true);
    expect(isOverdue(task({ due: "Nov 2" }), now)).toBe(false);
    expect(isOverdue(task({ due: "Dec 1" }), now)).toBe(false);
    expect(isOverdue(task({ due: "No due date" }), now)).toBe(false);
    expect(isOverdue(task({ due: "Nov 1", column: "Completed" }), now)).toBe(false);
  });
});

describe("computeReportMetrics", () => {
  const now = new Date("2026-11-02T12:00:00");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();

  it("counts completions in the window and compares with the previous 30 days", () => {
    const metrics = computeReportMetrics(
      [
        task({ column: "Completed", completedAt: daysAgo(1) }),
        task({ column: "Completed", completedAt: daysAgo(2) }),
        task({ column: "Completed", completedAt: daysAgo(40) }),
      ],
      now
    );
    expect(metrics.completedLast30).toBe(2);
    expect(metrics.completedDeltaPct).toBe(100);
  });

  it("returns nulls instead of inventing history", () => {
    const metrics = computeReportMetrics([task({ column: "Completed", completedAt: daysAgo(1) })], now);
    expect(metrics.completedDeltaPct).toBeNull();
    expect(metrics.avgCompletionDays).toBeNull();
    expect(metrics.onTimeRate).toBeNull();
  });

  it("computes the on-time rate from real due dates", () => {
    const metrics = computeReportMetrics(
      [
        task({ column: "Completed", due: "Oct 30", completedAt: "2026-10-29T10:00:00" }),
        task({ column: "Completed", due: "Oct 30", completedAt: "2026-11-01T10:00:00" }),
        task({ column: "Completed", due: "No due date", completedAt: daysAgo(1) }),
      ],
      now
    );
    expect(metrics.onTimeRate).toBe(50);
  });

  it("averages createdAt to completedAt for the window", () => {
    const metrics = computeReportMetrics(
      [
        task({ column: "Completed", createdAt: "2026-10-28T12:00:00", completedAt: "2026-10-30T12:00:00" }),
        task({ column: "Completed", createdAt: "2026-10-30T12:00:00", completedAt: "2026-11-01T12:00:00" }),
      ],
      now
    );
    expect(metrics.avgCompletionDays).toBe(2);
  });

  it("counts open past-due tasks as at risk right now", () => {
    const metrics = computeReportMetrics(
      [
        task({ due: "Oct 1" }),
        task({ due: "Dec 1" }),
        task({ column: "Completed", due: "Oct 1", completedAt: daysAgo(1) }),
      ],
      now
    );
    expect(metrics.atRiskNow).toBe(1);
  });
});

describe("computeProjectReport", () => {
  const now = new Date("2026-11-02T12:00:00");
  const nameFor = (initials: string) => (initials === "AR" ? "Anna R." : "Jade K.");

  it("picks the busiest owner, the next deadline and a health status", () => {
    const rows = computeProjectReport(
      [
        task({ project: "Q4 launch", assignee: "AR" }),
        task({ project: "Q4 launch", assignee: "AR" }),
        task({ project: "Q4 launch", assignee: "JK", due: "Nov 9" }),
      ],
      nameFor,
      now
    );
    expect(rows[0]).toMatchObject({
      name: "Q4 launch",
      owner: "Anna R.",
      tasks: 3,
      progress: 0,
      status: "Watch",
      due: "2026-11-09",
    });
  });

  it("marks overdue work At risk and finished projects Completed", () => {
    const rows = computeProjectReport(
      [
        task({ project: "Late", due: "Oct 1" }),
        task({ project: "Done", column: "Completed" }),
      ],
      nameFor,
      now
    );
    const late = rows.find((r) => r.name === "Late");
    const done = rows.find((r) => r.name === "Done");
    expect(late?.status).toBe("At risk");
    expect(done?.status).toBe("Completed");
  });

  it("falls back to Unassigned when no task has an owner", () => {
    const rows = computeProjectReport([task({ project: "Solo" })], nameFor, now);
    expect(rows[0].owner).toBe("Unassigned");
  });
});
