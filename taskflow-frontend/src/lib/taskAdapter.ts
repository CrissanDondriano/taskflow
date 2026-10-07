import type { Priority, Task, TaskColumn } from "../types";
import { initialsOf } from "./format";

/**
 * The single translation layer between the Laravel API's shapes
 * (TaskResource / ProjectResource — snake_case enums and ISO dates) and the
 * SPA's display shapes (Capitalised columns/priorities, "Jul 4" due strings,
 * initials for assignees). Keeping it pure and dependency-free makes every
 * rule here directly unit-testable and keeps API details out of components.
 */

export type ApiStatus = "backlog" | "todo" | "in_progress" | "review" | "testing" | "completed";
export type ApiPriority = "low" | "medium" | "high" | "critical";

export interface ApiTask {
  id: number;
  project_id: number;
  assignee_id: number | null;
  title: string;
  description: string | null;
  status: ApiStatus;
  priority: ApiPriority;
  category: string | null;
  due_date: string | null;
  position: number;
  completed_at: string | null;
  assignee?: { id: number; name: string; avatar_url: string | null } | null;
}

export interface ApiProject {
  id: number;
  team_id: number | null;
  name: string;
}

const STATUS_TO_COLUMN: Record<ApiStatus, TaskColumn> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  testing: "Testing",
  completed: "Completed",
};

const COLUMN_TO_STATUS: Record<TaskColumn, ApiStatus> = Object.fromEntries(
  Object.entries(STATUS_TO_COLUMN).map(([status, column]) => [column, status])
) as Record<TaskColumn, ApiStatus>;

const PRIORITY_TO_API: Record<Priority, ApiPriority> = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Critical: "critical",
};

const API_TO_PRIORITY: Record<ApiPriority, Priority> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The calendar is deliberately frozen to 2026 (same anchor the deadline
 * helpers in lib/calendar use), so parsed due dates land in that year —
 * formatDueDate drops the year again for display.
 */
const DUE_ANCHOR_YEAR = 2026;

export function toApiStatus(column: TaskColumn): ApiStatus {
  return COLUMN_TO_STATUS[column];
}

export function fromApiStatus(status: ApiStatus): TaskColumn {
  return STATUS_TO_COLUMN[status] ?? "Backlog";
}

export function toApiPriority(priority: Priority): ApiPriority {
  return PRIORITY_TO_API[priority] ?? "medium";
}

export function fromApiPriority(priority: ApiPriority): Priority {
  return API_TO_PRIORITY[priority] ?? "Medium";
}

/**
 * "Jul 4" / "Dec 25" → "2026-07-04". Anything that isn't a month+day string
 * ("No due date", free text the date input accepted) maps to null, which the
 * API stores as a NULL due_date — same semantics the calendar already uses.
 */
export function parseDueDate(due: string): string | null {
  const match = due.trim().match(/^([A-Z][a-z]{2})\s+(\d{1,2})$/);
  if (!match) return null;
  const month = MONTHS_SHORT.indexOf(match[1]);
  const day = parseInt(match[2], 10);
  if (month === -1 || day < 1 || day > 31) return null;
  return `${DUE_ANCHOR_YEAR}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "2026-07-04" → "Jul 4"; null → "No due date" (the SPA's display copy). */
export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "No due date";
  const match = dueDate.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!match) return "No due date";
  const month = MONTHS_SHORT[parseInt(match[1], 10) - 1];
  return month ? `${month} ${parseInt(match[2], 10)}` : "No due date";
}

/** labels: ["api", "backend"] → category: "api,backend" (API column, max 100). */
export function labelsToCategory(labels?: string[]): string | null {
  if (!labels || labels.length === 0) return null;
  return labels.join(",").slice(0, 100);
}

/** category: "api,backend" → labels: ["api", "backend"] (undefined when empty). */
export function categoryToLabels(category: string | null): string[] | undefined {
  if (!category) return undefined;
  const labels = category.split(",").map((l) => l.trim()).filter(Boolean);
  return labels.length ? labels : undefined;
}

/**
 * API task → SPA task. The project name comes from the caller's projects
 * list (index responses don't eager-load project); the assignee's initials
 * come from the eager-loaded assignee relation.
 */
export function fromApiTask(api: ApiTask, projectNameById: Record<number, string>): Task {
  return {
    id: String(api.id),
    title: api.title,
    project: projectNameById[api.project_id] ?? "",
    priority: fromApiPriority(api.priority),
    assignee: api.assignee ? initialsOf(api.assignee.name) : "",
    due: formatDueDate(api.due_date),
    column: fromApiStatus(api.status),
    description: api.description ?? undefined,
    labels: categoryToLabels(api.category),
    completedAt: api.completed_at ?? undefined,
  };
}

export function fromApiProject(api: ApiProject): { id: number; name: string; teamId: number | null } {
  return { id: api.id, name: api.name, teamId: api.team_id };
}
