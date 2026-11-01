import {
  LayoutDashboard,
  KanbanSquare,
  Calendar as CalendarIcon,
  FileText,
  Users,
  MessageSquare,
  BarChart3,
  CreditCard,
  Settings,
  Sparkles,
  Shield,
  X,
  LogOut,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { Avatar } from "../ui/Primitives";
import { useAuth } from "../../context/AuthContext";
import { useThemeStore } from "../../stores/themeStore";
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
      { to: "/dashboard/chat", label: "Team chat", icon: MessageSquare },
      { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
      { to: "/dashboard/billing", label: "Billing", icon: CreditCard },
      { to: "/dashboard/admin", label: "Admin", icon: Shield, adminOnly: true },
      { to: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <nav aria-label="Dashboard" className="flex-1 min-h-0 overflow-y-auto tf-scroll flex flex-col gap-6 px-4">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => !item.adminOnly || isAdmin);
        if (items.length === 0) return null;

        return (
          <div key={group.label} className="flex flex-col gap-0.5">
            <span className="px-3 pb-2 text-[10.5px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--tf-ink-muted)" }}>
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
                    `relative flex items-center gap-3 h-10 px-3 rounded-xl text-[13.5px] transition-colors ${
                      isActive
                        ? "font-semibold text-[var(--tf-ink)]"
                        : "font-medium text-[var(--tf-ink-muted)] hover:bg-[var(--tf-fill-04)] hover:text-[var(--tf-ink)]"
                    }`
                  }
                  style={({ isActive }) =>
                    isActive ? { background: "color-mix(in srgb, var(--tf-primary) 15%, transparent)" } : undefined
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute -left-4 top-1.5 bottom-1.5 w-1 rounded-r-full"
                          style={{ background: "var(--tf-teal)", boxShadow: "0 0 10px var(--tf-teal)" }}
                        />
                      )}
                      <Icon size={16} aria-hidden="true" className="shrink-0" />
                      <span className="truncate">{n.label}</span>
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
    <div className="flex items-center gap-2.5">
      <div
        className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(140deg, #2DD4BF, #2563EB)", boxShadow: "0 0 18px rgba(45,212,191,0.32)" }}
      >
        <Sparkles size={17} color="#fff" aria-hidden="true" />
      </div>
      <span className="text-[18px] font-display font-semibold tracking-[-0.01em]" style={{ color: "var(--tf-ink)" }}>
        TaskFlow <span style={{ color: "var(--tf-teal)" }}>AI</span>
      </span>
    </div>
  );
}

/** Avatar + name + role, with theme + logout actions. Shared by both sidebars. */
function ProfileFooter({ onRequestLogout }: { onRequestLogout: () => void }) {
  const { user } = useAuth();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <div className="px-4 pt-4">
      <div className="pt-4 flex items-center gap-2.5" style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
        <Avatar initials={initialsOf(user?.name)} color="#2563EB" size={36} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold truncate" style={{ color: "var(--tf-ink)" }}>
            {user?.name ?? "Guest"}
          </div>
          <div className="text-[11.5px] capitalize" style={{ color: "var(--tf-ink-muted)" }}>
            {user?.role ?? ""}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "var(--tf-ink-muted)" }}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={onRequestLogout}
            aria-label="Log out"
            title="Log out"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "var(--tf-ink-muted)" }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function DesktopSidebar({ onRequestLogout }: { onRequestLogout: () => void }) {
  return (
    <div
      className="w-[272px] xl:w-[300px] 2xl:w-[340px] shrink-0 hidden lg:flex flex-col py-5 relative z-10"
      style={{ background: "var(--tf-surface)", borderRight: "1px solid var(--tf-panel-border)" }}
    >
      <div className="px-6 mb-7">
        <Brand />
      </div>

      <NavLinks />

      <div className="mt-auto">
        <ProfileFooter onRequestLogout={onRequestLogout} />
      </div>
    </div>
  );
}

export function MobileSidebar({ open, onClose, onRequestLogout }: { open: boolean; onClose: () => void; onRequestLogout: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "var(--tf-overlay)" }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 top-0 bottom-0 w-[280px] flex flex-col py-5"
        style={{ background: "var(--tf-surface)", borderRight: "1px solid var(--tf-panel-border)" }}
      >
        <div className="flex items-center justify-between px-6 mb-7">
          <Brand />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "var(--tf-ink-muted)" }}
          >
            <X size={17} />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
        <div className="mt-auto">
          <ProfileFooter onRequestLogout={onRequestLogout} />
        </div>
      </div>
    </div>
  );
}
