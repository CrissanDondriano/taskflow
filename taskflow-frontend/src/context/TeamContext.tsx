import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { Person } from "../types";

const COLORS = ["#2563EB", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

function initialsOf(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

interface TeamContextValue {
  members: Person[];
  addMember: (person: Person) => void;
  removeMember: (initials: string) => void;
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

/**
 * Real team state — no fictional employees. A production account starts
 * with exactly one member: whoever is actually logged in, derived from
 * AuthContext (name/email/role come from the real /api/login response).
 * Everyone else has to be genuinely invited via the Team page.
 */
export function TeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Person[]>([]);

  // Seed (or refresh) the current user's own member record when auth resolves.
  useEffect(() => {
    if (!user) return;
    setMembers((prev) => {
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
      const exists = prev.some((p) => p.email === user.email);
      return exists ? prev.map((p) => (p.email === user.email ? { ...p, ...self, color: p.color } : p)) : [self, ...prev];
    });
  }, [user]);

  function addMember(person: Person) {
    setMembers((prev) => [...prev, { ...person, color: person.color ?? COLORS[prev.length % COLORS.length] }]);
  }

  function removeMember(initials: string) {
    setMembers((prev) => prev.filter((p) => p.initials !== initials));
  }

  return <TeamContext.Provider value={{ members, addMember, removeMember }}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within a TeamProvider");
  return ctx;
}
