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
