export type Priority = "Low" | "Medium" | "High" | "Critical";

export type TaskColumn =
  | "Backlog"
  | "To Do"
  | "In Progress"
  | "Review"
  | "Testing"
  | "Completed";

export type PresenceStatus = "online" | "away" | "offline";

export interface Person {
  /** Backend user id — present when the member came from (or was persisted to) the API. */
  id?: number;
  initials: string;
  name: string;
  color: string;
  role: string;
  /** Real job title from the API (null when nobody set one — display a fallback, never invent one). */
  jobTitle: string | null;
  department: string;
  status: PresenceStatus;
  workloadPct: number;
  email: string;
}

export interface ChecklistProgress {
  done: number;
  total: number;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  assignee: string; // Person['initials']
  due: string;
  column: TaskColumn;
  atRisk?: boolean;
  description?: string;
  labels?: string[];
  checklist?: ChecklistProgress;
  completedAt?: string; // ISO timestamp, set automatically when column becomes "Completed"
}

export interface Meeting {
  id: string;
  title: string;
  day: number; // day-of-month within the app's anchor month (July 2026)
  startHour: number; // 0-23
  durationHours: number;
  priority: Priority;
  attendees: string[]; // Person['initials'][]
}

export interface DeadlineItem {
  id: string;
  title: string;
  day: number;
  priority: Priority;
  project: string;
}

export interface ActionItem {
  id: string;
  title: string;
  owner: string;
  priority: Priority;
  selected: boolean;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "manager" | "member";
}

export interface AdminStats {
  users: number;
  teams: number;
  projects: number;
  tasks: number;
  audit_events: number;
  ai: { insights: number; configured: boolean; model: string };
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: AuthUser["role"];
  job_title: string | null;
  avatar_url: string | null;
  assigned_tasks_count: number;
  created_at: string | null;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  user: { id: number; name: string; email: string } | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
}
