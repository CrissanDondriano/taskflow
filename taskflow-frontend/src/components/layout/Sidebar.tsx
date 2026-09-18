import {
  LayoutDashboard,
  KanbanSquare,
  Calendar as CalendarIcon,
  FileText,
  Users,
  BarChart3,
  Settings,
  Sparkles,
  X,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Avatar } from "../ui/Primitives";
import { useAuth } from "../../context/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Mission control", icon: LayoutDashboard, end: true },
  { to: "/dashboard/kanban", label: "Kanban board", icon: KanbanSquare },
  { to: "/dashboard/calendar", label: "Calendar", icon: CalendarIcon },
  { to: "/dashboard/meeting-notes", label: "Meeting notes", icon: FileText },
  { to: "/dashboard/team", label: "Team", icon: Users },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const Icon = n.icon;
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium relative transition-colors ${
                isActive ? "text-white" : ""
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? "white" : "var(--tf-ink-muted)",
              background: isActive ? "rgba(37,99,235,0.18)" : "transparent",
            })}
          >
            {({ isActive }) =>
              isActive ? (
                <>
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full"
                    style={{ background: "var(--tf-teal)", boxShadow: "0 0 8px var(--tf-teal)" }}
                  />
                  <Icon size={16} />
                  {n.label}
                </>
              ) : (
                <>
                  <Icon size={16} />
                  {n.label}
                </>
              )
            }
          </NavLink>
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

export function DesktopSidebar() {
  const { user, logout } = useAuth();

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
        <button onClick={logout} aria-label="Log out" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
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
          <button onClick={logout} aria-label="Log out" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function initialsOf(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
