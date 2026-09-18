import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Search, Plus, Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { DesktopSidebar, MobileSidebar } from "./Sidebar";
import { NotificationsBell } from "./NotificationsBell";
import { CommandPalette } from "../command-palette/CommandPalette";
import { DailyBriefingModal } from "../ai/DailyBriefingModal";
import { FloatingAssistant } from "../ai/FloatingAssistant";
import { NewTaskModal } from "../dashboard/NewTaskModal";
import { useTasks } from "../../context/TasksContext";
import { useMeetings } from "../../context/MeetingsContext";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";

const TITLES: Record<string, string> = {
  "/dashboard": "Mission control",
  "/dashboard/kanban": "Kanban board",
  "/dashboard/calendar": "Calendar",
  "/dashboard/meeting-notes": "Meeting notes",
  "/dashboard/team": "Team",
  "/dashboard/reports": "Reports",
  "/dashboard/settings": "Settings",
};

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const { tasks, addTask } = useTasks();
  const { meetings } = useMeetings();
  const location = useLocation();
  const title = TITLES[location.pathname] ?? "TaskFlow AI";

  useKeyboardShortcut("k", () => setPaletteOpen(true), { meta: true });

  return (
    <div className="w-full min-h-screen flex relative overflow-hidden" style={{ background: "var(--tf-void)" }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(600px circle at 15% 10%, rgba(37,99,235,0.14), transparent 60%), radial-gradient(500px circle at 85% 85%, rgba(20,184,166,0.10), transparent 60%)",
          opacity: "var(--tf-aurora-opacity)",
        }}
      />

      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={addTask} defaultColumn="Backlog" />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNewTask={() => setModalOpen(true)} onOpenBriefing={() => setBriefingOpen(true)} />
      <DailyBriefingModal open={briefingOpen} onClose={() => setBriefingOpen(false)} tasks={tasks} meetings={meetings} />
      <FloatingAssistant />
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <div
          className="flex items-center justify-between gap-3 px-4 sm:px-8 py-4 sm:py-5"
          style={{ borderBottom: "1px solid var(--tf-panel-border)", background: "var(--tf-surface-translucent)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
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
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl text-[13px] w-56"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
            >
              <Search size={14} aria-hidden="true" />
              <span className="flex-1 text-left">Search or jump to...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--tf-panel-border)" }}>
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setBriefingOpen(true)}
              aria-label="Daily briefing"
              title="Daily briefing"
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-teal)" }}
            >
              <Sparkles size={16} />
            </button>
            <NotificationsBell />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
              <span className="hidden sm:inline">New task</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
