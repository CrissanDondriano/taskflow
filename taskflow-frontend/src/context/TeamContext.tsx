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
