import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, Plus, Sparkles, Sun, Moon, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { DesktopSidebar } from "./Sidebar";
import { NotificationsBell } from "./NotificationsBell";
import { FloatingAssistant } from "../ai/FloatingAssistant";
import { DashboardModals, preloadOverlaysOnDemand } from "./DashboardModals";
import { useTaskActions, useTasksLoading } from "../../context/TasksContext";
import { useTeamLoading } from "../../context/TeamContext";
import { useAuth } from "../../context/AuthContext";
import { useUIStore } from "../../stores/uiStore";
import { useThemeStore } from "../../stores/themeStore";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";

const TITLES: Record<string, string> = {
  "/dashboard": "Mission control",
  "/dashboard/kanban": "Kanban board",
  "/dashboard/calendar": "Calendar",
  "/dashboard/meeting-notes": "Meeting notes",
  "/dashboard/team": "Team",
  "/dashboard/chat": "Team chat",
  "/dashboard/reports": "Reports",
  "/dashboard/admin": "Admin",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
};

export function DashboardLayout() {
  // Modal/drawer open state lives in the UI store, not here — opening an
  // overlay must not re-render the shell (sidebar, topbar, page transition).
  // Triggers call openModal() on the store without subscribing; only the
  // overlay itself re-renders when activeModal changes.
  const { addTask } = useTaskActions();
  const { logout } = useAuth();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  // First-load gate: without it, pages flash their empty states while the
  // API fetch is still in flight (narrow flag subscriptions, not task data).
  // Both hooks are called unconditionally on separate lines — combining them
  // with || would short-circuit the second call and shift the hook order.
  const tasksLoading = useTasksLoading();
  const teamLoading = useTeamLoading();
  const workspaceLoading = tasksLoading || teamLoading;
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const title = TITLES[location.pathname] ?? "TaskFlow AI";

  useKeyboardShortcut("k", () => useUIStore.getState().openModal("palette"), { meta: true });
  useKeyboardShortcut("?", () => useUIStore.getState().toggleModal("shortcuts"));

  // Keep the browser tab in sync with the visible page (marketing routes
  // use usePageMeta; the dashboard's seven tabs are covered by this effect).
  useEffect(() => {
    document.title = `${title} | TaskFlow AI`;
  }, [title]);

  // <main> is the scroller on dashboard routes (the window isn't), so reset
  // it here; RouteEffects handles window scroll for the marketing routes.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    // The shell is locked to the viewport (h-dvh + overflow-hidden) so the
    // window never scrolls on dashboard routes: <main> below is the single
    // scroll container, and the sidebar stays pinned while content moves.
    // The min-h-0 chain (shell → column → main) is what lets flex children
    // actually engage their overflow instead of growing past the viewport.
    <div className="w-full h-dvh flex relative overflow-hidden" style={{ background: "var(--tf-void)" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:text-[13px] focus:font-medium"
      >
        Skip to content
      </a>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 15% 10%, rgba(37,99,235,0.14), transparent 60%), radial-gradient(500px circle at 85% 85%, rgba(20,184,166,0.10), transparent 60%)",
          opacity: "var(--tf-aurora-opacity)",
        }}
      />

      <DashboardModals addTask={addTask} logout={logout} />
      <FloatingAssistant />
      <DesktopSidebar onRequestLogout={() => useUIStore.getState().openModal("logout")} />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <div
          className="flex items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-5 shrink-0"
          style={{ borderBottom: "1px solid var(--tf-panel-border)", background: "var(--tf-surface-translucent)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => useUIStore.getState().openModal("sidebar")}
              aria-label="Open menu"
              className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
            >
              <Menu size={16} />
            </button>
            <h1 className="text-[17px] sm:text-[20px] truncate font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => useUIStore.getState().openModal("palette")}
              onPointerEnter={preloadOverlaysOnDemand}
              onFocus={preloadOverlaysOnDemand}
              className="hidden md:flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl text-[13px] w-56"
              style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
            >
              <Search size={14} aria-hidden="true" />
              <span className="flex-1 text-left">Search or jump to...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--tf-panel-border)" }}>
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => useUIStore.getState().openModal("briefing")}
              onPointerEnter={preloadOverlaysOnDemand}
              onFocus={preloadOverlaysOnDemand}
              aria-label="Daily briefing"
              title="Daily briefing"
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-teal)" }}
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <NotificationsBell />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => useUIStore.getState().openModal("newTask")}>
              <span className="hidden sm:inline">New task</span>
            </Button>
          </div>
        </div>

        <main id="main-content" tabIndex={-1} ref={mainRef} className="flex-1 min-h-0 overflow-y-auto tf-scroll p-4 sm:p-8 outline-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {workspaceLoading ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="h-full flex flex-col items-center justify-center gap-3 py-24"
                >
                  <Loader2 size={22} className="animate-spin" style={{ color: "var(--tf-teal)" }} />
                  <p className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>
                    Loading your workspace...
                  </p>
                </div>
              ) : (
                <Outlet />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
