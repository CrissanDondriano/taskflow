import { create } from "zustand";
import { api, ApiError, fetchAll } from "../lib/api";
import {
  type ApiProject,
  type ApiTask,
  fromApiProject,
  fromApiTask,
  labelsToCategory,
  parseDueDate,
  toApiPriority,
  toApiStatus,
} from "../lib/taskAdapter";
import type { Task, TaskColumn } from "../types";
import { useAuthStore } from "./authStore";
import { useTeamStore } from "./teamStore";
import { useToastStore } from "./toastStore";

export interface WorkspaceProject {
  id: number;
  name: string;
  teamId: number | null;
}

interface TasksState {
  tasks: Task[];
  /** Projects visible to the signed-in user — home for newly created tasks. */
  projects: WorkspaceProject[];
  /** True while the first API load runs (DashboardLayout gates pages on it). */
  loading: boolean;
  /** Most recently deleted task + its position, kept for undoDelete. */
  lastDeleted: { task: Task; index: number } | null;
  /** Pulls tasks + projects from the API (runs on login/session restore). */
  load: () => Promise<void>;
  addTask: (task: Task) => void;
  moveTask: (id: string, column: TaskColumn) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  /** Restores the task removed by the most recent deleteTask call. */
  undoDelete: () => void;
  /** Wipes local workspace state on logout so the next account starts clean. */
  clearWorkspace: () => void;
}

function toastError(message: string) {
  useToastStore.getState().toast(message, "error");
}

function projectNameMap(projects: WorkspaceProject[]): Record<number, string> {
  return Object.fromEntries(projects.map((p) => [p.id, p.name]));
}

/** Initials → backend user id, resolved against the loaded team members. */
function resolveAssigneeId(initials: string): number | null {
  if (!initials) return null;
  return useTeamStore.getState().members.find((p) => p.initials === initials)?.id ?? null;
}

/**
 * Finds the SPA's implicit project by name (case-insensitive), creating it
 * on the fly if the account has none yet — the UI lets people type any
 * project name, and every account needs somewhere for tasks to live.
 */
async function resolveProjectId(name: string): Promise<number> {
  const wanted = name.trim() || "General";
  const existing = useTasksStore
    .getState()
    .projects.find((p) => p.name.toLowerCase() === wanted.toLowerCase());
  if (existing) return existing.id;

  const created = await api.post<{ data: ApiProject }>("/projects", { name: wanted });
  const project = fromApiProject(created.data);
  useTasksStore.setState((prev) => ({ projects: [...prev.projects, project] }));
  return project.id;
}

async function createPayload(task: Task): Promise<Record<string, unknown>> {
  return {
    project_id: await resolveProjectId(task.project),
    title: task.title,
    description: task.description ?? null,
    status: toApiStatus(task.column),
    priority: toApiPriority(task.priority),
    category: labelsToCategory(task.labels),
    due_date: parseDueDate(task.due),
    assignee_id: resolveAssigneeId(task.assignee),
    position: useTasksStore.getState().tasks.filter((t) => t.id !== task.id).length,
  };
}

/**
 * Persists an optimistically-inserted task, swapping its temporary local id
 * for the server's. If the user moved the task while the create was in
 * flight, the move is re-issued against the real id; on failure the phantom
 * entry is removed and the user is told.
 */
async function persistNew(task: Task): Promise<void> {
  try {
    const created = await api.post<{ data: ApiTask }>("/tasks", await createPayload(task));
    const serverTask = fromApiTask(created.data, projectNameMap(useTasksStore.getState().projects));

    const local = useTasksStore.getState().tasks.find((t) => t.id === task.id);
    const movedWhileSaving = local && local.column !== serverTask.column ? local.column : null;

    useTasksStore.setState((prev) => ({
      tasks: prev.tasks.map((t) => (t.id === task.id ? serverTask : t)),
    }));
    if (movedWhileSaving) useTasksStore.getState().moveTask(serverTask.id, movedWhileSaving);
  } catch (err) {
    useTasksStore.setState((prev) => ({ tasks: prev.tasks.filter((t) => t.id !== task.id) }));
    toastError(err instanceof ApiError ? err.message : "Couldn't save the task — it was removed again.");
  }
}

function updatePayload(patch: Partial<Task>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.description !== undefined) payload.description = patch.description || null;
  if (patch.priority !== undefined) payload.priority = toApiPriority(patch.priority);
  if (patch.column !== undefined) payload.status = toApiStatus(patch.column);
  if (patch.assignee !== undefined) payload.assignee_id = resolveAssigneeId(patch.assignee);
  if (patch.due !== undefined) payload.due_date = parseDueDate(patch.due);
  if (patch.labels !== undefined) payload.category = labelsToCategory(patch.labels);
  return payload;
}

/**
 * Task state + actions, migrated from context/TasksContext to Zustand and
 * wired to the Laravel API. Every mutation updates local state first
 * (instant UI), then persists; a failed write rolls back and explains
 * itself instead of silently diverging.
 */
export const useTasksStore = create<TasksState>()((set, get) => ({
  tasks: [],
  projects: [],
  loading: false,
  lastDeleted: null,

  async load() {
    set({ loading: true });
    try {
      const [projects, tasks] = await Promise.all([
        fetchAll<ApiProject>("/projects"),
        fetchAll<ApiTask>("/tasks"),
      ]);
      const mappedProjects = projects.map(fromApiProject);
      const names = projectNameMap(mappedProjects);
      set({
        projects: mappedProjects,
        tasks: tasks.map((t) => fromApiTask(t, names)),
        loading: false,
      });
    } catch (err) {
      set({ loading: false });
      toastError(err instanceof ApiError ? err.message : "Couldn't load your tasks.");
    }
  },

  addTask(task) {
    // Generators use t${Date.now()} — two creates in the same millisecond
    // would share an id and the server-id swap would clobber one of them.
    const ready = get().tasks.some((t) => t.id === task.id)
      ? { ...task, id: `${task.id}-${get().tasks.length}` }
      : task;
    const withCompletion =
      ready.column === "Completed" && !ready.completedAt
        ? { ...ready, completedAt: new Date().toISOString() }
        : ready;
    set((prev) => ({ tasks: [...prev.tasks, withCompletion] }));
    void persistNew(withCompletion);
  },

  moveTask(id, column) {
    const before = get().tasks;
    set((prev) => ({
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const justCompleted = column === "Completed" && t.column !== "Completed";
        return { ...t, column, completedAt: justCompleted ? new Date().toISOString() : t.completedAt };
      }),
    }));

    const position = before.filter((t) => t.column === column && t.id !== id).length;
    void api
      .patch(`/tasks/${id}/move`, { status: toApiStatus(column), position })
      .catch(() => {
        set({ tasks: before });
        toastError("Couldn't move the task — it was put back.");
      });
  },

  updateTask(id, patch) {
    const before = get().tasks;
    set((prev) => ({
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const justCompleted = patch.column === "Completed" && t.column !== "Completed";
        return { ...t, ...patch, completedAt: justCompleted ? new Date().toISOString() : patch.completedAt ?? t.completedAt };
      }),
    }));

    const payload = updatePayload(patch);
    if (Object.keys(payload).length === 0) return;
    void api.patch(`/tasks/${id}`, payload).catch(() => {
      set({ tasks: before });
      toastError("Couldn't save the task — your change was reverted.");
    });
  },

  deleteTask(id) {
    set((prev) => {
      const index = prev.tasks.findIndex((t) => t.id === id);
      if (index === -1) return prev;
      return { tasks: prev.tasks.filter((t) => t.id !== id), lastDeleted: { task: prev.tasks[index], index } };
    });

    void api.delete(`/tasks/${id}`).catch((err) => {
      // Put the row back exactly where it was; undoDelete becomes a no-op
      // (it finds the task already present and just clears lastDeleted).
      set((prev) => {
        const target = prev.lastDeleted;
        if (!target || target.task.id !== id || prev.tasks.some((t) => t.id === id)) return prev;
        const tasks = [...prev.tasks];
        tasks.splice(Math.min(target.index, tasks.length), 0, target.task);
        return { tasks };
      });
      toastError(err instanceof ApiError ? err.message : "Couldn't delete the task — it was restored.");
    });
  },

  undoDelete() {
    const prev = get();
    if (!prev.lastDeleted) return;
    const { task, index } = prev.lastDeleted;
    if (prev.tasks.some((t) => t.id === task.id)) {
      set({ lastDeleted: null });
      return;
    }
    set((s) => {
      const tasks = [...s.tasks];
      tasks.splice(Math.min(index, tasks.length), 0, task);
      return { tasks, lastDeleted: null };
    });
    // Re-create server-side (DELETE is permanent) and adopt the new id.
    void persistNew(task);
  },

  clearWorkspace() {
    set({ tasks: [], projects: [], loading: false, lastDeleted: null });
  },
}));

/**
 * Reload the workspace whenever the signed-in account changes; wipe it on
 * logout so tasks never bleed between accounts. Profile edits keep the same
 * user id and deliberately don't trigger a reload.
 */
useAuthStore.subscribe((state, prev) => {
  const was = prev.user?.id ?? null;
  const now = state.user?.id ?? null;
  if (now === was) return;
  if (now === null) useTasksStore.getState().clearWorkspace();
  else void useTasksStore.getState().load();
});

// Edge case: a session restored before this module ran.
if (useAuthStore.getState().user) void useTasksStore.getState().load();
