import { createContext, useContext, useState, type ReactNode } from "react";
import type { Meeting } from "../types";

interface MeetingsContextValue {
  meetings: Meeting[];
  moveMeeting: (id: string, day: number, startHour: number) => void;
  resizeMeeting: (id: string, durationHours: number) => void;
  updateMeeting: (id: string, patch: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
}

const MeetingsContext = createContext<MeetingsContextValue | undefined>(undefined);

/**
 * Previously Calendar-only local state — lifted so Team's "shared calendar
 * preview" and live availability status can read the same data, and so an
 * edit made in Calendar (drag, resize, delete) doesn't disappear the moment
 * you navigate to another page.
 */
export function MeetingsProvider({ children }: { children: ReactNode }) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  function moveMeeting(id: string, day: number, startHour: number) {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, day, startHour } : m)));
  }
  function resizeMeeting(id: string, durationHours: number) {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, durationHours } : m)));
  }
  function updateMeeting(id: string, patch: Partial<Meeting>) {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function deleteMeeting(id: string) {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <MeetingsContext.Provider value={{ meetings, moveMeeting, resizeMeeting, updateMeeting, deleteMeeting }}>
      {children}
    </MeetingsContext.Provider>
  );
}

export function useMeetings() {
  const ctx = useContext(MeetingsContext);
  if (!ctx) throw new Error("useMeetings must be used within a MeetingsProvider");
  return ctx;
}
