import { useNotificationsStore, type AppNotification } from "../stores/notificationsStore";

export type { AppNotification };

/**
 * Public hook for notifications. State lives in the Zustand notifications
 * store, whose module-level subscriptions derive notifications from real
 * changes in the tasks and meetings stores (the two useEffects that used
 * to run in NotificationsProvider). unreadCount is derived at render time,
 * exactly as before. Consumers keep calling useNotifications() unchanged.
 */
export function useNotifications() {
  const { notifications, markRead, markAllRead } = useNotificationsStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount, markRead, markAllRead };
}
