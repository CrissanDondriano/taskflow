import { describe, expect, it } from "vitest";
import {
  categoryToLabels,
  formatDueDate,
  fromApiPriority,
  fromApiStatus,
  fromApiTask,
  labelsToCategory,
  parseDueDate,
  toApiPriority,
  toApiStatus,
} from "./taskAdapter";
import type { ApiTask } from "./taskAdapter";

const apiTask: ApiTask = {
  id: 7,
  project_id: 1,
  assignee_id: 2,
  title: "Write tests",
  description: null,
  status: "in_progress",
  priority: "high",
  category: "api,backend",
  due_date: "2026-07-04",
  position: 3,
  completed_at: null,
  assignee: { id: 2, name: "Jane Doe", avatar_url: null },
};

describe("fromApiTask", () => {
  it("maps an API task to the SPA shape", () => {
    expect(fromApiTask(apiTask, { 1: "General" })).toEqual({
      id: "7",
      title: "Write tests",
      project: "General",
      priority: "High",
      assignee: "JD",
      due: "Jul 4",
      column: "In Progress",
      description: undefined,
      labels: ["api", "backend"],
      completedAt: undefined,
    });
  });

  it("falls back to an empty project name when the project isn't loaded", () => {
    expect(fromApiTask(apiTask, {}).project).toBe("");
  });

  it("maps unassigned tasks to an empty assignee", () => {
    expect(fromApiTask({ ...apiTask, assignee_id: null, assignee: null }, {}).assignee).toBe("");
  });
});

describe("due date mapping", () => {
  it("parses month-day strings into the calendar's anchor year", () => {
    expect(parseDueDate("Jul 4")).toBe("2026-07-04");
    expect(parseDueDate("Dec 25")).toBe("2026-12-25");
  });

  it("returns null for anything that isn't a month and day", () => {
    expect(parseDueDate("No due date")).toBeNull();
    expect(parseDueDate("tomorrow")).toBeNull();
    expect(parseDueDate("")).toBeNull();
  });

  it("formats API dates back to display strings", () => {
    expect(formatDueDate("2026-07-04")).toBe("Jul 4");
    expect(formatDueDate(null)).toBe("No due date");
  });
});

describe("labels <-> category", () => {
  it("joins and splits through the API's single category column", () => {
    expect(labelsToCategory(["api", "backend"])).toBe("api,backend");
    expect(labelsToCategory(undefined)).toBeNull();
    expect(categoryToLabels("api,backend")).toEqual(["api", "backend"]);
    expect(categoryToLabels(null)).toBeUndefined();
  });
});

describe("status and priority mapping", () => {
  it("maps both ways", () => {
    expect(toApiStatus("In Progress")).toBe("in_progress");
    expect(fromApiStatus("completed")).toBe("Completed");
    expect(toApiPriority("Critical")).toBe("critical");
    expect(fromApiPriority("low")).toBe("Low");
  });
});
