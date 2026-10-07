import { create } from "zustand";
import type { Meeting } from "../types";

interface MeetingsState {
  meetings: Meeting[];
  /** Most recently deleted meeting + its position, kept for undoDelete. */
  lastDeleted: { meeting: Meeting; index: number } | null;
  moveMeeting: (id: string, day: number, startHour: number) => void;
  resizeMeeting: (id: string, durationHours: number) => void;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  /** Restores the meeting removed by the most recent deleteMeeting call. */
  undoDelete: () => void;
}

/**
 * Calendar meeting state + actions, migrated from context/MeetingsContext
 * to Zustand. Lifted state (shared by Calendar and Team pages) per the
 * original provider's doc comment.
 */
export const useMeetingsStore = create<MeetingsState>()((set) => ({
  meetings: [],
  lastDeleted: null,

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
    set((prev) => {
      const index = prev.meetings.findIndex((m) => m.id === id);
      if (index === -1) return prev;
      return { meetings: prev.meetings.filter((m) => m.id !== id), lastDeleted: { meeting: prev.meetings[index], index } };
    });
  },

  undoDelete() {
    set((prev) => {
      if (!prev.lastDeleted) return prev;
      const { meeting, index } = prev.lastDeleted;
      if (prev.meetings.some((m) => m.id === meeting.id)) return { lastDeleted: null };
      const meetings = [...prev.meetings];
      meetings.splice(Math.min(index, meetings.length), 0, meeting);
      return { meetings, lastDeleted: null };
    });
  },
}));
