import type { Priority } from "../types";
import { initialsOf } from "./format";

/**
 * Pure mappers for the plan-import review flow (server shapes → editor rows
 * → approve payload). Untested API details stay in the modal; everything
 * here is unit-testable.
 */

export type ApiPriority = "low" | "medium" | "high" | "urgent" | "critical";

export interface ApiReviewTask {
  title: string;
  description?: string;
  required_role?: string | null;
  priority?: ApiPriority;
  estimated_days?: number;
  depends_on?: string[];
  suggested_due_offset_days?: number;
  assignee_id?: number | null;
  assignee_name?: string | null;
  needs_assignee?: boolean;
}

export interface ReviewRow {
  key: string;
  title: string;
  description: string;
  priority: Priority;
  /** YYYY-MM-DD or "" — edited directly in the review table. */
  dueDate: string;
  requiredRole: string;
  /** Backend user id, or "" for unassigned. */
  assigneeId: number | "";
  assigneeName: string;
  needsAssignee: boolean;
  dependsOn: string[];
}

const API_TO_PRIORITY: Record<ApiPriority, Priority> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Critical",
  critical: "Critical",
};

const PRIORITY_TO_API: Record<Priority, "low" | "medium" | "high" | "critical"> = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Critical: "critical",
};

export function toPriority(p?: ApiPriority): Priority {
  return (p && API_TO_PRIORITY[p]) || "Medium";
}

export function toApiPriority(p: Priority): "low" | "medium" | "high" | "critical" {
  return PRIORITY_TO_API[p] ?? "medium";
}

/** N working-day offset from today → "2026-07-09". Empty offset → "". */
export function offsetToDateString(offset?: number): string {
  if (offset === undefined || offset === null || offset < 0) return "";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** "2026-07-04" → "Jul 4" for compact display; "" stays "". */
export function formatDueShort(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(m[1], 10) - 1] ?? ""} ${parseInt(m[2], 10)}`;
}

let rowCounter = 0;

/** Server review row → editable editor row. */
export function toReviewRow(t: ApiReviewTask): ReviewRow {
  return {
    key: `row-${Date.now()}-${rowCounter++}`,
    title: t.title ?? "",
    description: t.description ?? "",
    priority: toPriority(t.priority),
    dueDate: offsetToDateString(t.suggested_due_offset_days),
    requiredRole: t.required_role ?? "",
    assigneeId: t.assignee_id ?? "",
    assigneeName: t.assignee_name ?? "",
    needsAssignee: t.needs_assignee ?? t.assignee_id == null,
    dependsOn: t.depends_on ?? [],
  };
}

export function blankRow(): ReviewRow {
  return {
    key: `row-${Date.now()}-${rowCounter++}`,
    title: "",
    description: "",
    priority: "Medium",
    dueDate: "",
    requiredRole: "",
    assigneeId: "",
    assigneeName: "",
    needsAssignee: false,
    dependsOn: [],
  };
}

export interface ApproveTask {
  title: string;
  description?: string | null;
  priority: "low" | "medium" | "high" | "critical";
  required_role?: string | null;
  assignee_id?: number | null;
  due_date?: string | null;
  depends_on?: string[];
}

/** Editor rows → approve payload (drops untitled rows). */
export function toApprovePayload(rows: ReviewRow[]): ApproveTask[] {
  return rows
    .filter((r) => r.title.trim() !== "")
    .map((r) => ({
      title: r.title.trim(),
      description: r.description.trim() || null,
      priority: toApiPriority(r.priority),
      required_role: r.requiredRole.trim() || null,
      assignee_id: r.assigneeId === "" ? null : r.assigneeId,
      due_date: r.dueDate || null,
      depends_on: r.dependsOn,
    }));
}

/** "JD" for display next to the quick-assign dropdown. */
export function assigneeInitials(name: string): string {
  return name ? initialsOf(name) : "";
}

export const PLAN_FILE_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;

export const PLAN_MAX_BYTES = 10 * 1024 * 1024;

/** Client-side file check mirroring the server's validation (message shown verbatim). */
export function validatePlanFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(PLAN_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return "That file type won't work — upload a PDF, DOCX, TXT or Markdown file.";
  }
  if (file.size > PLAN_MAX_BYTES) {
    return "That file is over the 10MB limit — try a shorter plan or split it in two.";
  }
  if (file.size === 0) {
    return "That file is empty — pick a plan with some content in it.";
  }
  return null;
}
