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
  initials: string;
  name: string;
  color: string;
  role: string;
  jobTitle: string;
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
