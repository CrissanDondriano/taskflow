import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTasksStore } from "./tasksStore";
import { useAuthStore } from "./authStore";
import { useToastStore } from "./toastStore";
import type { Task } from "../types";

const authUser = { id: 1, name: "Me Myself", email: "me@example.test", role: "member" as const };

const apiTaskJson = {
  id: 7,
  project_id: 1,
  assignee_id: 2,
  title: "Write tests",
  description: null,
  status: "todo",
  priority: "high",
  category: "api,backend",
  due_date: "2026-07-04",
  position: 0,
  completed_at: null,
  assignee: { id: 2, name: "Jane Doe", avatar_url: null },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Route table keyed by URL path suffix — the api client builds absolute
 * URLs (API_URL + path), so match on the tail. Unmatched routes 404.
 */
function mockApi(routes: Record<string, (init?: RequestInit) => Promise<Response>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const key = Object.keys(routes).find((k) => url.endsWith(k));
      const handler = key ? routes[key] : undefined;
      if (!handler) return jsonResponse({ message: `No mock for ${url}` }, 404);
      return handler(init);
    })
  );
}

function emptyProjects() {
  return { data: [], meta: { last_page: 1 } };
}

function resetStores() {
  useTasksStore.setState({ tasks: [], projects: [], loading: false, lastDeleted: null });
  useAuthStore.setState({ user: null, bootstrapping: false, error: null });
  useToastStore.setState({ toasts: [] });
  localStorage.clear();
}

function newTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    title: "New task",
    project: "General",
    priority: "Medium",
    assignee: "",
    due: "No due date",
    column: "Backlog",
    ...overrides,
  };
}

describe("tasksStore", () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    // Dismiss toasts so their auto-dismiss timers don't outlive the test.
    for (const t of useToastStore.getState().toasts) useToastStore.getState().dismiss(t.id);
    vi.unstubAllGlobals();
  });

  it("loads tasks and projects from the API on login", async () => {
    mockApi({
      // teamStore subscribes to the same auth change — give it an empty team list.
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/projects?per_page=100&page=1": async () => jsonResponse({ data: [{ id: 1, team_id: null, name: "General" }], meta: { last_page: 1 } }),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [apiTaskJson], meta: { last_page: 1 } }),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTasksStore.getState().loading).toBe(false));

    const { tasks, projects } = useTasksStore.getState();
    expect(projects).toEqual([{ id: 1, name: "General", teamId: null }]);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ id: "7", title: "Write tests", due: "Jul 4", assignee: "JD" });
  });

  it("persists a new task and swaps the temp id for the server id", async () => {
    mockApi({
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/projects?per_page=100&page=1": async () => jsonResponse(emptyProjects()),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/projects": async () => jsonResponse({ data: { id: 1, team_id: null, name: "General" } }, 201),
      "/tasks": async () => jsonResponse({ data: { ...apiTaskJson, id: 42 } }, 201),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTasksStore.getState().loading).toBe(false));

    useTasksStore.getState().addTask(newTask());
    expect(useTasksStore.getState().tasks).toHaveLength(1); // optimistic insert

    await vi.waitFor(() => expect(useTasksStore.getState().tasks[0].id).toBe("42"));
  });

  it("removes the optimistic task and toasts when the create fails", async () => {
    mockApi({
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/projects?per_page=100&page=1": async () => jsonResponse(emptyProjects()),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/projects": async () => jsonResponse({ data: { id: 1, team_id: null, name: "General" } }, 201),
      "/tasks": async () => jsonResponse({ message: "Validation failed." }, 422),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTasksStore.getState().loading).toBe(false));

    useTasksStore.getState().addTask(newTask());
    await vi.waitFor(() => expect(useTasksStore.getState().tasks).toHaveLength(0));
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it("rolls a failed move back to the original column", async () => {
    mockApi({
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/projects?per_page=100&page=1": async () => jsonResponse({ data: [{ id: 1, team_id: null, name: "General" }], meta: { last_page: 1 } }),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [apiTaskJson], meta: { last_page: 1 } }),
      "/tasks/7/move": async () => jsonResponse({ message: "boom" }, 500),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTasksStore.getState().loading).toBe(false));

    useTasksStore.getState().moveTask("7", "In Progress");
    expect(useTasksStore.getState().tasks[0].column).toBe("In Progress"); // optimistic

    await vi.waitFor(() => expect(useTasksStore.getState().tasks[0].column).toBe("To Do")); // rolled back
  });

  it("deletes a task and re-creates it through undoDelete", async () => {
    mockApi({
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/projects?per_page=100&page=1": async () => jsonResponse({ data: [{ id: 1, team_id: null, name: "General" }], meta: { last_page: 1 } }),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [apiTaskJson], meta: { last_page: 1 } }),
      "/projects": async () => jsonResponse({ data: { id: 1, team_id: null, name: "General" } }, 201),
      "/tasks/7": async (init) =>
        init?.method === "DELETE"
          ? jsonResponse({ message: "Task deleted." })
          : jsonResponse({ data: apiTaskJson }),
      "/tasks": async () => jsonResponse({ data: { ...apiTaskJson, id: 99 } }, 201),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTasksStore.getState().loading).toBe(false));
    expect(useTasksStore.getState().tasks).toHaveLength(1);

    useTasksStore.getState().deleteTask("7");
    await vi.waitFor(() => expect(useTasksStore.getState().tasks).toHaveLength(0));

    useTasksStore.getState().undoDelete();
    await vi.waitFor(() => expect(useTasksStore.getState().tasks).toHaveLength(1));
    // Re-created server-side (DELETE is permanent) → the new id is adopted.
    await vi.waitFor(() => expect(useTasksStore.getState().tasks[0].id).toBe("99"));
  });

  it("clears the workspace on logout", async () => {
    mockApi({
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/projects?per_page=100&page=1": async () => jsonResponse({ data: [{ id: 1, team_id: null, name: "General" }], meta: { last_page: 1 } }),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [apiTaskJson], meta: { last_page: 1 } }),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTasksStore.getState().loading).toBe(false));
    expect(useTasksStore.getState().tasks).toHaveLength(1);

    useAuthStore.setState({ user: null });
    expect(useTasksStore.getState().tasks).toHaveLength(0);
    expect(useTasksStore.getState().projects).toHaveLength(0);
  });
});
