import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Search, Plus, Sparkles, PanelLeft, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { DesktopSidebar } from "./Sidebar";
import { NotificationsBell } from "./NotificationsBell";
import { FloatingAssistant } from "../ai/FloatingAssistant";
import { DashboardModals, preloadOverlaysOnDemand } from "./DashboardModals";
import { useTaskActions, useTasksLoading } from "../../context/TasksContext";
import { useTeamLoading } from "../../context/TeamContext";
import { useAuth } from "../../context/AuthContext";
import { useUIStore } from "../../stores/uiStore";
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

/** "Home › Kanban board" — the comp puts it opposite the page title. */
function Breadcrumb({ title }: { title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-[12.5px] shrink-0">
      <Link to="/dashboard" className="rounded transition-opacity hover:opacity-80" style={{ color: "var(--tf-ink-muted)" }}>
        Home
      </Link>
      <ChevronRight size={12} aria-hidden="true" style={{ color: "var(--tf-ink-muted)" }} />
      <span aria-current="page" style={{ color: "var(--tf-ink-soft)" }}>
        {title}
      </span>
    </nav>
  );
}

export function DashboardLayout() {
  // Modal/drawer open state lives in the UI store, not here — opening an
  // overlay must not re-render the shell (sidebar, topbar, page transition).
  // Triggers call openModal() on the store without subscribing; only the
  // overlay itself re-renders when activeModal changes.
  const { addTask } = useTaskActions();
  const { logout } = useAuth();
  // First-load gate: without it, pages flash their empty states while the
  // API fetch is still in flight (narrow flag subscriptions, not task data).
  // Both hooks are called unconditionally on separate lines — combining them
  // with || would short-circuit the second call and shift the hook order.
  const tasksLoading = useTasksLoading();
  const teamLoading = useTeamLoading();
  const workspaceLoading = tasksLoading || teamLoading;
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const title = TITLES[location.pathname] ?? "TaskFlow AI";
  // Mission control owns its heading (the greeting); every other route gets
  // the shared title + breadcrumb header rendered here.
  const showsPageHeader = location.pathname !== "/dashboard";

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
            "radial-gradient(700px circle at 22% 0%, rgba(37,99,235,0.16), transparent 62%), radial-gradient(560px circle at 88% 92%, rgba(20,184,166,0.09), transparent 62%)",
          opacity: "var(--tf-aurora-opacity)",
        }}
      />

      <DashboardModals addTask={addTask} logout={logout} />
      <FloatingAssistant />
      {!collapsed && <DesktopSidebar onRequestLogout={() => useUIStore.getState().openModal("logout")} />}

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <div
          className="flex items-center gap-3 px-4 sm:px-6 h-[68px] shrink-0"
          style={{ borderBottom: "1px solid var(--tf-panel-border)", background: "var(--tf-header)", backdropFilter: "blur(12px)" }}
        >
          <button
            onClick={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((c) => !c);
              else useUIStore.getState().openModal("sidebar");
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors hover:bg-white/5"
            style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
          >
            <PanelLeft size={16} aria-hidden="true" />
          </button>

          <button
            onClick={() => useUIStore.getState().openModal("palette")}
            onPointerEnter={preloadOverlaysOnDemand}
            onFocus={preloadOverlaysOnDemand}
            aria-label="Search or jump to"
            className="hidden md:flex items-center gap-2.5 h-10 pl-3.5 pr-2 rounded-xl text-[13px] w-full max-w-[420px] transition-colors hover:border-[var(--tf-fill-12)]"
            style={{ background: "var(--tf-fill-03)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
          >
            <Search size={15} aria-hidden="true" className="shrink-0" />
            <span className="flex-1 text-left truncate">Search or type command...</span>
            <kbd
              className="text-[10px] font-mono px-1.5 py-1 rounded-md shrink-0"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
            >
              ⌘K
            </kbd>
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              onClick={() => useUIStore.getState().openModal("palette")}
              onPointerEnter={preloadOverlaysOnDemand}
              onFocus={preloadOverlaysOnDemand}
              aria-label="Search or jump to"
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
            >
              <Search size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => useUIStore.getState().openModal("briefing")}
              onPointerEnter={preloadOverlaysOnDemand}
              onFocus={preloadOverlaysOnDemand}
              aria-label="Daily briefing"
              title="Daily briefing"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-teal)" }}
            >
              <Sparkles size={16} aria-hidden="true" />
            </button>
            <NotificationsBell />
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              aria-label="New task"
              onClick={() => useUIStore.getState().openModal("newTask")}
              style={{ height: 40, paddingInline: 16, borderRadius: 12, fontSize: 13, fontWeight: 600 }}
            >
              <span className="hidden sm:inline">New task</span>
            </Button>
          </div>
        </div>

        <main id="main-content" tabIndex={-1} ref={mainRef} className="flex-1 min-h-0 overflow-y-auto tf-scroll px-4 sm:px-6 lg:px-7 py-5 sm:py-6 outline-none">
          <AnimatePresence mode="wait">
            <motion.div
              key="dashboard-main"
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
                <>
                  {showsPageHeader && (
                    <div className="flex items-end justify-between gap-4 mb-5">
                      <h1
                        className="font-display text-[25px] sm:text-[30px] font-semibold leading-tight tracking-[-0.02em] truncate"
                        style={{ color: "var(--tf-ink)" }}
                      >
                        {title}
                      </h1>
                      <Breadcrumb title={title} />
                    </div>
                  )}
                  <Outlet />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
