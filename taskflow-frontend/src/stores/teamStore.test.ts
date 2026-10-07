import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTeamStore } from "./teamStore";
import { useAuthStore } from "./authStore";

const authUser = { id: 1, name: "Me Myself", email: "me@example.test", role: "member" as const };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

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

const teamJson = {
  id: 3,
  name: "Core",
  members: [{ id: 2, name: "Jane Doe", email: "jane@example.test", role_in_team: "lead" as const }],
};

function resetStores() {
  useTeamStore.setState({ team: null, members: [], loading: false, lastDeleted: null });
  useAuthStore.setState({ user: null, bootstrapping: false, error: null });
  localStorage.clear();
}

describe("teamStore", () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the first team and maps members, merging in the signed-in user", async () => {
    mockApi({
      // tasksStore subscribes to the same auth change — empty workspace.
      "/projects?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [teamJson], meta: { last_page: 1 } }),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTeamStore.getState().loading).toBe(false));

    const { team, members } = useTeamStore.getState();
    expect(team).toEqual({ id: 3, name: "Core" });
    expect(members).toHaveLength(2); // API member + self merged in

    const jane = members.find((m) => m.email === "jane@example.test");
    expect(jane?.initials).toBe("JD");
    expect(jane?.role).toBe("manager"); // team lead
    expect(jane?.id).toBe(2);

    const self = members.find((m) => m.email === "me@example.test");
    expect(self?.status).toBe("online");
    expect(self?.id).toBe(1);
  });

  it("creates the team on first invite when none exists", async () => {
    mockApi({
      "/projects?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/teams": async () => jsonResponse({ data: { id: 5, name: "Me Myself's team" } }, 201),
      "/teams/5/members": async () =>
        jsonResponse({
          data: { id: 5, name: "Me Myself's team", members: [{ id: 2, name: "Jane Doe", email: "jane@example.test", role_in_team: "member" }] },
        }),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTeamStore.getState().loading).toBe(false));

    await useTeamStore.getState().inviteByEmail("jane@example.test");

    expect(useTeamStore.getState().team?.id).toBe(5);
    expect(useTeamStore.getState().members.some((m) => m.email === "jane@example.test")).toBe(true);
  });

  it("rolls back a member removal when the server refuses", async () => {
    mockApi({
      "/projects?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/tasks?per_page=100&page=1": async () => jsonResponse({ data: [], meta: { last_page: 1 } }),
      "/teams?per_page=100&page=1": async () => jsonResponse({ data: [teamJson], meta: { last_page: 1 } }),
      "/teams/3/members/2": async () => jsonResponse({ message: "This action is unauthorized." }, 403),
    });

    useAuthStore.setState({ user: authUser });
    await vi.waitFor(() => expect(useTeamStore.getState().loading).toBe(false));

    useTeamStore.getState().removeMember("JD");
    expect(useTeamStore.getState().members.some((m) => m.email === "jane@example.test")).toBe(false); // optimistic

    await vi.waitFor(() =>
      expect(useTeamStore.getState().members.some((m) => m.email === "jane@example.test")).toBe(true)
    ); // restored
  });
});
