import { create } from "zustand";
import type { Meeting } from "../types";

interface MeetingsState {
  meetings: Meeting[];
  moveMeeting: (id: string, day: number, startHour: number) => void;
  resizeMeeting: (id: string, durationHours: number) => void;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
}

/**
 * Calendar meeting state + actions, migrated from context/MeetingsContext
 * to Zustand. Lifted state (shared by Calendar and Team pages) per the
 * original provider's doc comment.
 */
export const useMeetingsStore = create<MeetingsState>()((set) => ({
  meetings: [],

  moveMeeting(id, day, startHour) {
    set((prev) => ({ meetings: prev.meetings.map((m) => (m.id === id ? { ...m, day, startHour } : m)) }));
  },
  resizeMeeting(id, durationHours) {
    set((prev) => ({ meetings: prev.meetings.map((m) => (m.id === id ? { ...m, durationHours } : m)) }));
  },
  updateMeeting(id, patch) {
    set((prev) => ({ meetings: prev.meetings.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  },
  deleteMeeting(id) {
    set((prev) => ({ meetings: prev.meetings.filter((m) => m.id !== id) }));
  },
}));
