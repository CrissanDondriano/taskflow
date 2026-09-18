import { Activity, Inbox } from "lucide-react";
import { GlassPanel } from "../ui/Primitives";
import { useNotifications } from "../../context/NotificationsContext";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * A real reverse-chronological feed of what's actually happened — reuses
 * the same NotificationsContext that drives the bell icon, rather than a
 * separate hardcoded list of fictional comments and activity.
 */
export function CollaborationTimeline() {
  const { notifications } = useNotifications();

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center gap-1.5 mb-4">
        <Activity size={14} color="var(--tf-ink-muted)" />
        <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
          Collaboration timeline
        </h3>
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8" style={{ color: "var(--tf-ink-muted)" }}>
          <Inbox size={20} />
          <p className="text-sm text-center">Activity will show up here as your team creates, moves, and completes tasks.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.slice(0, 8).map((n) => (
            <div key={n.id} className="text-sm">
              <span style={{ color: "var(--tf-ink)" }}>{n.message}</span>
              <div className="text-[10px] font-mono mt-0.5" style={{ color: "#4B5A73" }}>
                {timeAgo(n.when)}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
