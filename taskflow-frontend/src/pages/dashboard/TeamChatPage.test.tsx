import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TeamChatPage } from "./TeamChatPage";
import { useTeamStore } from "../../stores/teamStore";
import { useAuthStore } from "../../stores/authStore";

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

function resetStores() {
  useTeamStore.setState({
    team: { id: 3, name: "Core", ownerId: 1 },
    members: [],
    loading: false,
    lastDeleted: null,
  });
  useAuthStore.setState({ user: authUser, bootstrapping: false, error: null });
  localStorage.clear();
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TeamChatPage />
    </MemoryRouter>
  );
}

describe("TeamChatPage", () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads and displays messages", async () => {
    mockApi({
      "/teams/3/messages": async (init) =>
        init?.method === "POST"
          ? jsonResponse({ data: { id: 2, body: "Hello back", created_at: null, user: { id: 1, name: "Me Myself" } } }, 201)
          : jsonResponse({ data: [{ id: 1, body: "Hello team", created_at: null, user: { id: 2, name: "Jane Doe" } }] }),
    });

    renderPage();

    expect(await screen.findByText("Hello team")).toBeTruthy();
    expect(screen.getByText("Jane Doe")).toBeTruthy();
  });

  it("sends a message and clears the box", async () => {
    mockApi({
      "/teams/3/messages": async (init) =>
        init?.method === "POST"
          ? jsonResponse({ data: { id: 9, body: "Shipping Friday", created_at: null, user: { id: 1, name: "Me Myself" } } }, 201)
          : jsonResponse({ data: [] }),
    });

    const { container } = renderPage();
    expect(await screen.findByText(/No messages yet/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Write a chat message"), { target: { value: "Shipping Friday" } });
    fireEvent.click(screen.getByLabelText("Send message"));

    expect(await screen.findByText("Shipping Friday")).toBeTruthy();
    expect((container.querySelector('input[aria-label="Write a chat message"]') as HTMLInputElement).value).toBe("");
  });

  it("shows the no-team empty state with a link", async () => {
    useTeamStore.setState({ team: null });
    mockApi({});

    renderPage();

    expect(await screen.findByText(/invite a member first/)).toBeTruthy();
    expect(screen.getByText("Go to the Team page →")).toBeTruthy();
  });
});
