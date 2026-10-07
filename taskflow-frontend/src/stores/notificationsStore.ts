import { create } from "zustand";
import { useTasksStore } from "./tasksStore";
import { useMeetingsStore } from "./meetingsStore";
import { detectConflicts } from "../lib/calendar";

export interface AppNotification {
  id: string;
  message: string;
  when: string; // ISO timestamp
  read: boolean;
}

interface NotificationsState {
  notifications: AppNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  push: (items: AppNotification[]) => void;
}

/**
 * Notifications are derived from real state changes in the tasks and
 * meetings stores — a task being created, moved to Completed, flagged
 * at-risk, or two meetings starting to overlap — rather than a fabricated
 * list. (Migrated from context/NotificationsContext: the two useEffects
 * became store subscriptions below.)
 */
export const useNotificationsStore = create<NotificationsState>()((set) => ({
  notifications: [],

  markRead(id) {
    set((prev) => ({ notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  },

  markAllRead() {
    set((prev) => ({ notifications: prev.notifications.map((n) => ({ ...n, read: true })) }));
  },

  push(items) {
    set((prev) => ({ notifications: [...items, ...prev.notifications] }));
  },
}));

// --- Derivation: tasks -> created / completed / at-risk notifications ---
// The known-sets start from whatever exists right now, mirroring the old
// provider's first effect run (which recorded the initial dataset and only
// notified about *changes* from there on).
const knownIds = new Set<string>();
const knownCompleted = new Set<string>();
const knownAtRisk = new Set<string>();

function recordExistingTasks() {
  useTasksStore.getState().tasks.forEach((t) => {
    knownIds.add(t.id);
    if (t.column === "Completed") knownCompleted.add(t.id);
    if (t.atRisk) knownAtRisk.add(t.id);
  });
}
recordExistingTasks();

useTasksStore.subscribe((state) => {
  const newNotifications: AppNotification[] = [];
  const now = new Date().toISOString();

  state.tasks.forEach((t) => {
    if (!knownIds.has(t.id)) {
      knownIds.add(t.id);
      newNotifications.push({ id: `created-${t.id}-${Date.now()}`, message: `New task created: "${t.title}"`, when: now, read: false });
    }
    if (t.column === "Completed" && !knownCompleted.has(t.id)) {
      knownCompleted.add(t.id);
      newNotifications.push({ id: `done-${t.id}-${Date.now()}`, message: `Task completed: "${t.title}"`, when: now, read: false });
    }
    if (t.atRisk && !knownAtRisk.has(t.id)) {
      knownAtRisk.add(t.id);
      newNotifications.push({ id: `risk-${t.id}-${Date.now()}`, message: `AI flagged "${t.title}" as at risk`, when: now, read: false });
    }
  });

  if (newNotifications.length > 0) {
    useNotificationsStore.getState().push(newNotifications);
  }
});

// --- Derivation: meetings -> scheduling-conflict notifications ---
const knownConflicts = new Set<string>(detectConflicts(useMeetingsStore.getState().meetings));

useMeetingsStore.subscribe((state) => {
  const conflictIds = detectConflicts(state.meetings);
  const newConflictNotifications: AppNotification[] = [];
  const now = new Date().toISOString();

  conflictIds.forEach((id) => {
    if (knownConflicts.has(id)) return;
    knownConflicts.add(id);
    const meeting = state.meetings.find((m) => m.id === id);
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
    useNotificationsStore.getState().push(newConflictNotifications);
  }
});
