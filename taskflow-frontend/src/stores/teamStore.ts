import { create } from "zustand";
import { api, ApiError, fetchAll } from "../lib/api";
import { useAuthStore } from "./authStore";
import { initialsOf } from "../lib/format";
import type { AuthUser, Person } from "../types";
import { useToastStore } from "./toastStore";

const COLORS = ["#2563EB", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

/** TeamResource member row as returned by the API. */
interface ApiMember {
  id: number;
  name: string;
  email: string;
  role_in_team: "lead" | "member";
}

interface ApiTeam {
  id: number;
  name: string;
  members?: ApiMember[];
}

interface TeamState {
  /** The SPA's single active team (first team the account belongs to). */
  team: { id: number; name: string } | null;
  members: Person[];
  /** True while the first API load runs (DashboardLayout gates pages on it). */
  loading: boolean;
  /** Most recently removed member + their position, kept for undoDelete. */
  lastDeleted: { person: Person; index: number } | null;
  /** Pulls the account's team + members from the API (runs on login). */
  load: () => Promise<void>;
  /** Adds an existing account to the team by email; creates the team first if needed. Throws ApiError. */
  inviteByEmail: (email: string) => Promise<void>;
  addMember: (person: Person) => void;
  removeMember: (initials: string) => void;
  /** Restores the member removed by the most recent removeMember call. */
  undoDelete: () => void;
  /** Seeds/refreshes the logged-in user's own member record (was TeamProvider's effect). */
  syncSelf: (user: AuthUser | null) => void;
  /** Wipes local team state on logout. */
  clearTeam: () => void;
}

function toastError(message: string) {
  useToastStore.getState().toast(message, "error");
}

/** API member row → Person (display fields the schema doesn't store get sensible defaults). */
function mapMember(m: ApiMember, index: number): Person {
  const lead = m.role_in_team === "lead";
  return {
    id: m.id,
    initials: initialsOf(m.name),
    name: m.name,
    email: m.email,
    color: COLORS[index % COLORS.length],
    role: lead ? "manager" : "member",
    jobTitle: lead ? "Team lead" : "Team member",
    department: "General",
    status: "offline",
    workloadPct: 0,
  };
}

/** The account's team, creating one on the fly (the SPA assumes an implicit team). */
async function ensureTeam(): Promise<{ id: number; name: string }> {
  const existing = useTeamStore.getState().team;
  if (existing) return existing;
  const user = useAuthStore.getState().user;
  const created = await api.post<{ data: ApiTeam }>("/teams", {
    name: user ? `${user.name}'s team` : "My team",
  });
  const team = { id: created.data.id, name: created.data.name };
  useTeamStore.setState({ team });
  return team;
}

/**
 * Real team state — no fictional employees. Members come from the API
 * (first team the account belongs to); the signed-in user's own record is
 * always merged in from auth, so a brand-new account with no team still
 * shows exactly one member: themselves.
 */
export const useTeamStore = create<TeamState>()((set, get) => ({
  team: null,
  members: [],
  loading: false,
  lastDeleted: null,

  async load() {
    set({ loading: true });
    try {
      const teams = await fetchAll<ApiTeam>("/teams");
      const first = teams[0] ?? null;
      set({
        team: first ? { id: first.id, name: first.name } : null,
        members: first ? (first.members ?? []).map(mapMember) : [],
        loading: false,
        lastDeleted: null,
      });
      // Merge the auth user's own record (keeps self fields + id authoritative).
      useTeamStore.getState().syncSelf(useAuthStore.getState().user);
    } catch (err) {
      set({ loading: false });
      toastError(err instanceof ApiError ? err.message : "Couldn't load your team.");
    }
  },

  async inviteByEmail(email) {
    const team = await ensureTeam();
    const res = await api.post<{ data: ApiTeam }>(`/teams/${team.id}/members`, { email });
    set({ members: (res.data.members ?? []).map(mapMember), lastDeleted: null });
    get().syncSelf(useAuthStore.getState().user);
  },

  addMember(person) {
    set((prev) => ({ members: [...prev.members, { ...person, color: person.color ?? COLORS[prev.members.length % COLORS.length] }] }));
  },

  removeMember(initials) {
    const { members, team } = get();
    const index = members.findIndex((p) => p.initials === initials);
    if (index === -1) return;
    const person = members[index];
    set((prev) => ({ members: prev.members.filter((p) => p.initials !== initials), lastDeleted: { person, index } }));

    // Local-only members (never persisted) are done here; API members also
    // need the pivot removed, with rollback if the server refuses (e.g. the
    // requester isn't the team owner).
    if (person.id == null || !team) return;
    void api.delete(`/teams/${team.id}/members/${person.id}`).catch((err) => {
      set((prev) => {
        if (prev.members.some((p) => p.initials === initials)) return { lastDeleted: null };
        const restored = [...prev.members];
        restored.splice(Math.min(index, restored.length), 0, person);
        return { members: restored, lastDeleted: null };
      });
      toastError(err instanceof ApiError ? err.message : "Couldn't remove the member — they were put back.");
    });
  },

  undoDelete() {
    const prev = get();
    if (!prev.lastDeleted) return;
    const { person, index } = prev.lastDeleted;
    if (prev.members.some((p) => p.initials === person.initials)) {
      set({ lastDeleted: null });
      return;
    }
    set((s) => {
      const members = [...s.members];
      members.splice(Math.min(index, members.length), 0, person);
      return { members, lastDeleted: null };
    });
    // Re-attach API members so the restore survives a reload too.
    if (person.id != null && prev.team) {
      void api.post(`/teams/${prev.team.id}/members`, { user_id: person.id }).catch((err) => {
        set((s) => ({ members: s.members.filter((p) => p.initials !== person.initials) }));
        toastError(err instanceof ApiError ? err.message : "Couldn't restore the member.");
      });
    }
  },

  syncSelf(user) {
    if (!user) return;
    set((prev) => {
      const self: Person = {
        id: user.id,
        initials: initialsOf(user.name),
        name: user.name,
        email: user.email,
        jobTitle: user.role === "admin" ? "Administrator" : user.role === "manager" ? "Project Manager" : "Team member",
        department: "General",
        status: "online",
        role: user.role,
        workloadPct: 0,
        color: COLORS[0],
      };
      const exists = prev.members.some((p) => p.email === user.email);
      return { members: exists ? prev.members.map((p) => (p.email === user.email ? { ...p, ...self, color: p.color } : p)) : [self, ...prev.members] };
    });
  },

  clearTeam() {
    set({ team: null, members: [], loading: false, lastDeleted: null });
  },
}));

// Same trigger as TeamProvider's useEffect([user]): whenever the auth
// store's user object changes (login, refresh, switch), re-sync the
// member record and reload the team from the API — including the initial
// run once auth has resolved. Logout wipes everything so accounts never
// bleed into each other.
useAuthStore.subscribe((state, prev) => {
  if (state.user !== prev.user) useTeamStore.getState().syncSelf(state.user);
  const was = prev.user?.id ?? null;
  const now = state.user?.id ?? null;
  if (now === was) return;
  if (now === null) useTeamStore.getState().clearTeam();
  else void useTeamStore.getState().load();
});
useTeamStore.getState().syncSelf(useAuthStore.getState().user);
if (useAuthStore.getState().user) void useTeamStore.getState().load();
