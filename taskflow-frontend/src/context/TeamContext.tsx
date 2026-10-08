import { useShallow } from "zustand/react/shallow";
import { useTeamStore } from "../stores/teamStore";
import { useAuthStore } from "../stores/authStore";

/**
 * Public hook for team members. State lives in the Zustand team store
 * (src/stores/teamStore.ts), which also subscribes to the auth store to
 * keep the logged-in user's own member record in sync — the job TeamProvider's
 * useEffect([user]) used to do. Consumers keep calling useTeam() as before.
 */
export function useTeam() {
  return useTeamStore();
}

/** Loading flag only — for the shell's first-load gate without subscribing to member data. */
export function useTeamLoading() {
  return useTeamStore((s) => s.loading);
}

/** Member list only — for components that only *read* members. */
export function useTeamMembers() {
  return useTeamStore((s) => s.members);
}

/** Actions without the data: for components that only *write* membership. */
export function useTeamActions() {
  return useTeamStore(
    useShallow((s) => ({
      inviteByEmail: s.inviteByEmail,
      setMemberTitle: s.setMemberTitle,
      addMember: s.addMember,
      removeMember: s.removeMember,
      undoDelete: s.undoDelete,
    }))
  );
}

/**
 * Whether the signed-in user may manage the team (edit titles, invite,
 * remove) — team owners and platform admins only, mirroring the backend's
 * TeamPolicy::update. Narrow subscriptions: re-renders only when the team
 * or the account's role changes.
 */
export function useCanManageTeam() {
  const ownerId = useTeamStore((s) => s.team?.ownerId ?? null);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const role = useAuthStore((s) => s.user?.role ?? null);
  if (userId === null) return false;
  return role === "admin" || ownerId === userId;
}
