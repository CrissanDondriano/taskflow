import { describe, expect, it } from "vitest";
import { computeCompletionSeries, computeProjectStatus, computeWeeklyTrend } from "./reports";
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
