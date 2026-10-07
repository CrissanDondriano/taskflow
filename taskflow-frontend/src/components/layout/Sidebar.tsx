import {
  LayoutDashboard,
  KanbanSquare,
  Calendar as CalendarIcon,
  FileText,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  Shield,
  X,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Avatar } from "../ui/Primitives";
import { useAuth } from "../../context/AuthContext";
import { initialsOf } from "../../lib/format";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Only shown to users whose role is admin. */
  adminOnly?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Mission control", icon: LayoutDashboard, end: true },
      { to: "/dashboard/kanban", label: "Kanban board", icon: KanbanSquare },
      { to: "/dashboard/calendar", label: "Calendar", icon: CalendarIcon },
      { to: "/dashboard/meeting-notes", label: "Meeting notes", icon: FileText },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/dashboard/team", label: "Team", icon: Users },
      { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      { to: "/dashboard/admin", label: "Admin", icon: Shield, adminOnly: true },
      { to: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <nav aria-label="Dashboard" className="flex-1 min-h-0 overflow-y-auto tf-scroll flex flex-col gap-4 pr-1">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;

        return (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="px-3 pb-1 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--tf-ink-muted)" }}>
              {group.label}
            </span>
            {items.map((n) => {
              const Icon = n.icon;
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                      isActive
                        ? "bg-[rgba(37,99,235,0.14)] text-[var(--tf-ink)]"
                        : "text-[var(--tf-ink-muted)] hover:bg-[var(--tf-fill-04)] hover:text-[var(--tf-ink)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full"
                          style={{ background: "var(--tf-teal)" }}
                        />
                      )}
                      <Icon size={16} aria-hidden="true" />
                      {n.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center relative"
        style={{ background: "linear-gradient(135deg, #2563EB, #14B8A6)", boxShadow: "0 0 18px rgba(20,184,166,0.4)" }}
      >
        <Sparkles size={16} color="#fff" />
      </div>
      <span className="text-[17px] font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
        TaskFlow <span style={{ color: "var(--tf-teal)" }}>AI</span>
      </span>
    </div>
  );
}

export function DesktopSidebar({ onRequestLogout }: { onRequestLogout: () => void }) {
  const { user } = useAuth();

  return (
    <div
      className="w-60 shrink-0 hidden lg:flex flex-col py-6 px-4 relative z-10"
      style={{ background: "var(--tf-surface-translucent)", borderRight: "1px solid var(--tf-panel-border)", backdropFilter: "blur(12px)" }}
    >
      <div className="px-2 mb-8">
        <Brand />
      </div>

      <div className="flex items-center gap-1.5 px-2 mb-5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--tf-success)", boxShadow: "0 0 6px var(--tf-success)" }} />
        <span className="text-[10px] font-mono tracking-wider" style={{ color: "var(--tf-ink-muted)" }}>
          AI SYSTEMS ONLINE
        </span>
      </div>

      <NavLinks />

      <div className="mt-auto pt-4 flex items-center gap-2 px-2" style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
        <Avatar initials={initialsOf(user?.name)} color="#2563EB" size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium truncate" style={{ color: "var(--tf-ink)" }}>
            {user?.name ?? "Guest"}
          </div>
          <div className="text-[11px] capitalize" style={{ color: "var(--tf-ink-muted)" }}>
            {user?.role ?? ""}
          </div>
        </div>
        <button onClick={onRequestLogout} aria-label="Log out" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

export function MobileSidebar({ open, onClose, onRequestLogout }: { open: boolean; onClose: () => void; onRequestLogout: () => void }) {
  const { user } = useAuth();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "var(--tf-overlay)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 top-0 bottom-0 w-64 flex flex-col py-6 px-4"
        style={{ background: "var(--tf-surface)", borderRight: "1px solid var(--tf-panel-border)" }}
      >
        <div className="flex items-center justify-between px-2 mb-8">
          <Brand />
          <button onClick={onClose} aria-label="Close menu" className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--tf-ink-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
        <div className="mt-auto pt-4 flex items-center gap-2 px-2" style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
          <Avatar initials={initialsOf(user?.name)} color="#2563EB" size={32} />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium truncate" style={{ color: "var(--tf-ink)" }}>
              {user?.name ?? "Guest"}
            </div>
          </div>
          <button onClick={onRequestLogout} aria-label="Log out" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

