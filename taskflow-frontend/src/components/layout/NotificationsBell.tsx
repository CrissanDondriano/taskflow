import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, Inbox } from "lucide-react";
import { useNotifications } from "../../context/NotificationsContext";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Renders the dropdown panel through a React portal into document.body,
 * positioned via the trigger button's real on-screen coordinates. Fixes a
 * real bug: nested inside the normal page flow, the panel could end up
 * visually behind glass-panel cards (backdrop-blur creates its own
 * stacking context) or clipped/misaligned on pages with sticky/scrolling
 * ancestors like the Kanban board. A portal sidesteps all of that.
 */
export function NotificationsBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function openPanel() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setOpen((o) => !o);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openPanel}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-mono flex items-center justify-center text-white"
            style={{ background: "var(--tf-danger)", boxShadow: "0 0 6px var(--tf-danger)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed w-80 max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden"
            style={{
              top: coords.top,
              right: coords.right,
              zIndex: 1000,
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-panel-border)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--tf-ink)" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs flex items-center gap-1" style={{ color: "var(--tf-teal)" }}>
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="tf-scroll max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 px-4" style={{ color: "var(--tf-ink-muted)" }}>
                  <Inbox size={20} />
                  <p className="text-xs text-center">You're all caught up. Create or complete a task and you'll see it here.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-2.5 transition-colors"
                    style={{ borderBottom: "1px solid var(--tf-panel-border)", background: n.read ? "transparent" : "rgba(37,99,235,0.06)" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: n.read ? "transparent" : "var(--tf-primary)", boxShadow: n.read ? "none" : "0 0 6px var(--tf-primary)" }}
                    />
                    <div className="min-w-0">
                      <p className="text-[12.5px] leading-snug" style={{ color: n.read ? "var(--tf-ink-muted)" : "var(--tf-ink)" }}>
                        {n.message}
                      </p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                        {timeAgo(n.when)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
