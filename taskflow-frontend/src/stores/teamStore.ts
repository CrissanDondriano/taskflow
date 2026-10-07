import { create } from "zustand";
import { useAuthStore } from "./authStore";
import type { AuthUser, Person } from "../types";

const COLORS = ["#2563EB", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

function initialsOf(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

interface TeamState {
  members: Person[];
  addMember: (person: Person) => void;
  removeMember: (initials: string) => void;
  /** Seeds/refreshes the logged-in user's own member record (was TeamProvider's effect). */
  syncSelf: (user: AuthUser | null) => void;
}

/**
 * Real team state — no fictional employees. A production account starts
 * with exactly one member: whoever is actually logged in, derived from
 * the auth store (name/email/role come from the real /api/login response).
 * Everyone else has to be genuinely invited via the Team page.
 */
export const useTeamStore = create<TeamState>()((set) => ({
  members: [],

  addMember(person) {
    set((prev) => ({ members: [...prev.members, { ...person, color: person.color ?? COLORS[prev.members.length % COLORS.length] }] }));
  },

  removeMember(initials) {
    set((prev) => ({ members: prev.members.filter((p) => p.initials !== initials) }));
  },

  syncSelf(user) {
    if (!user) return;
    set((prev) => {
      const self: Person = {
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
}));

// Same trigger as TeamProvider's useEffect([user]): whenever the auth
// store's user object changes (login, refresh, switch), re-sync the
// member record — including the initial run once auth has resolved.
useAuthStore.subscribe((state, prev) => {
  if (state.user !== prev.user) useTeamStore.getState().syncSelf(state.user);
});
useTeamStore.getState().syncSelf(useAuthStore.getState().user);
