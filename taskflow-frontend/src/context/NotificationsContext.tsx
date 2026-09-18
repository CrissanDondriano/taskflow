import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useTasks } from "./TasksContext";
import { useMeetings } from "./MeetingsContext";
import { detectConflicts } from "../lib/calendar";

export interface AppNotification {
  id: string;
  message: string;
  when: string; // ISO timestamp
  read: boolean;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

/**
 * Notifications are derived from real state changes in TasksContext and
 * MeetingsContext — a task being created, moved to Completed, flagged
 * at-risk, or two meetings starting to overlap — rather than a fabricated
 * list. This provider must sit inside both <TasksProvider> and
 * <MeetingsProvider>.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { tasks } = useTasks();
  const { meetings } = useMeetings();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const knownIds = useRef<Set<string>>(new Set());
  const knownCompleted = useRef<Set<string>>(new Set());
  const knownAtRisk = useRef<Set<string>>(new Set());
  const knownConflicts = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);
  const isFirstMeetingsRun = useRef(true);

  useEffect(() => {
    // On the very first render, just record what already exists — we only
    // want to notify about *changes* from here on, not the initial dataset.
    if (isFirstRun.current) {
      tasks.forEach((t) => {
        knownIds.current.add(t.id);
        if (t.column === "Completed") knownCompleted.current.add(t.id);
        if (t.atRisk) knownAtRisk.current.add(t.id);
      });
      isFirstRun.current = false;
      return;
    }

    const newNotifications: AppNotification[] = [];
    const now = new Date().toISOString();

    tasks.forEach((t) => {
      if (!knownIds.current.has(t.id)) {
        knownIds.current.add(t.id);
        newNotifications.push({ id: `created-${t.id}-${Date.now()}`, message: `New task created: "${t.title}"`, when: now, read: false });
      }
      if (t.column === "Completed" && !knownCompleted.current.has(t.id)) {
        knownCompleted.current.add(t.id);
        newNotifications.push({ id: `done-${t.id}-${Date.now()}`, message: `Task completed: "${t.title}"`, when: now, read: false });
      }
      if (t.atRisk && !knownAtRisk.current.has(t.id)) {
        knownAtRisk.current.add(t.id);
        newNotifications.push({ id: `risk-${t.id}-${Date.now()}`, message: `AI flagged "${t.title}" as at risk`, when: now, read: false });
      }
    });

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
    }
  }, [tasks]);

  useEffect(() => {
    const conflictIds = detectConflicts(meetings);

    if (isFirstMeetingsRun.current) {
      conflictIds.forEach((id) => knownConflicts.current.add(id));
      isFirstMeetingsRun.current = false;
      return;
    }

    const newConflictNotifications: AppNotification[] = [];
    const now = new Date().toISOString();

    conflictIds.forEach((id) => {
      if (knownConflicts.current.has(id)) return;
      knownConflicts.current.add(id);
      const meeting = meetings.find((m) => m.id === id);
      if (meeting) {
        newConflictNotifications.push({
          id: `conflict-${id}-${Date.now()}`,
          message: `AI detected a scheduling conflict: "${meeting.title}" overlaps another meeting`,
          when: now,
          read: false,
        });
      }
    });

    if (newConflictNotifications.length > 0) {
      setNotifications((prev) => [...newConflictNotifications, ...prev]);
    }
  }, [meetings]);

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationsProvider");
  return ctx;
}
