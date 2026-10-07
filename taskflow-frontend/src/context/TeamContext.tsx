import { useShallow } from "zustand/react/shallow";
import { useTeamStore } from "../stores/teamStore";

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
      addMember: s.addMember,
      removeMember: s.removeMember,
      undoDelete: s.undoDelete,
    }))
  );
}
