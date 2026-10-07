import { useShallow } from "zustand/react/shallow";
import { useMeetingsStore } from "../stores/meetingsStore";

/**
 * Public hook for calendar meeting state. Previously Calendar-only local
 * state, lifted so Team's "shared calendar preview" and live availability
 * can read the same data — now held in the Zustand meetings store so an
 * edit made in Calendar (drag, resize, delete) doesn't disappear when you
 * navigate to another page. Consumers keep calling useMeetings() as before.
 */
export function useMeetings() {
  return useMeetingsStore();
}

/** Meeting list only — for components that only *read* meetings. */
export function useMeetingsData() {
  return useMeetingsStore((s) => s.meetings);
}

/** Actions without the data: for components that only *write* meetings. */
export function useMeetingsActions() {
  return useMeetingsStore(
    useShallow((s) => ({
      moveMeeting: s.moveMeeting,
      resizeMeeting: s.resizeMeeting,
      updateMeeting: s.updateMeeting,
      deleteMeeting: s.deleteMeeting,
      undoDelete: s.undoDelete,
    }))
  );
}
