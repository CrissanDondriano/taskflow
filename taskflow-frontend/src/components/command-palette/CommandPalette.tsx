import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  KanbanSquare,
  Calendar as CalendarIcon,
  FileText,
  Users,
  BarChart3,
  Settings,
  Plus,
  LogOut,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTasks } from "../../context/TasksContext";
import { useMeetings } from "../../context/MeetingsContext";

export interface Command {
  id: string;
  label: string;
  group: "Actions" | "Navigate" | "Tasks" | "Meetings";
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

const GROUP_ORDER: Command["group"][] = ["Actions", "Tasks", "Meetings", "Navigate"];

/**
 * The "AI search experience" from the brief: type a task or meeting title
 * and it shows up as a real search result (fuzzy substring match against
 * the actual shared task/meeting lists), not just static navigation
 * commands. It's keyword matching, not semantic search — an honest
 * distinction worth keeping, since real semantic search needs embeddings
 * and a backend, not client-side string matching.
 */
export function CommandPalette({
  open,
  onClose,
  onNewTask,
  onOpenBriefing,
}: {
  open: boolean;
  onClose: () => void;
  onNewTask: () => void;
  onOpenBriefing: () => void;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { tasks } = useTasks();
  const { meetings } = useMeetings();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const staticCommands: Command[] = useMemo(
    () => [
      { id: "action-briefing", label: "Daily briefing", group: "Actions", icon: <Sparkles size={15} />, keywords: "ai summary today", run: onOpenBriefing },
      { id: "action-new-task", label: "Create new task", group: "Actions", icon: <Plus size={15} />, keywords: "add create", run: onNewTask },
      { id: "action-logout", label: "Log out", group: "Actions", icon: <LogOut size={15} />, run: () => { logout(); navigate("/"); } },
      { id: "nav-dashboard", label: "Go to Mission control", group: "Navigate", icon: <LayoutDashboard size={15} />, run: () => navigate("/dashboard") },
      { id: "nav-kanban", label: "Go to Kanban board", group: "Navigate", icon: <KanbanSquare size={15} />, run: () => navigate("/dashboard/kanban") },
      { id: "nav-calendar", label: "Go to Calendar", group: "Navigate", icon: <CalendarIcon size={15} />, run: () => navigate("/dashboard/calendar") },
      { id: "nav-notes", label: "Go to Meeting notes", group: "Navigate", icon: <FileText size={15} />, run: () => navigate("/dashboard/meeting-notes") },
      { id: "nav-team", label: "Go to Team", group: "Navigate", icon: <Users size={15} />, run: () => navigate("/dashboard/team") },
      { id: "nav-reports", label: "Go to Reports", group: "Navigate", icon: <BarChart3 size={15} />, run: () => navigate("/dashboard/reports") },
      { id: "nav-settings", label: "Go to Settings", group: "Navigate", icon: <Settings size={15} />, run: () => navigate("/dashboard/settings") },
    ],
    [navigate, logout, onNewTask, onOpenBriefing]
  );

  const q = query.trim().toLowerCase();

  const taskResults: Command[] = useMemo(() => {
    if (!q) return [];
    return tasks
      .filter((t) => t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q))
      .slice(0, 5)
      .map((t) => ({
        id: `task-${t.id}`,
        label: `${t.title} — ${t.column}`,
        group: "Tasks" as const,
        icon: <KanbanSquare size={15} />,
        run: () => navigate("/dashboard/kanban"),
      }));
  }, [tasks, q, navigate]);

  const meetingResults: Command[] = useMemo(() => {
    if (!q) return [];
    return meetings
      .filter((m) => m.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map((m) => ({
        id: `meeting-${m.id}`,
        label: `${m.title} — Jul ${m.day}`,
        group: "Meetings" as const,
        icon: <CalendarIcon size={15} />,
        run: () => navigate("/dashboard/calendar"),
      }));
  }, [meetings, q, navigate]);

  const filtered = useMemo(() => {
    const staticMatches = q ? staticCommands.filter((c) => `${c.label} ${c.keywords ?? ""}`.toLowerCase().includes(q)) : staticCommands;
    return [...staticMatches, ...taskResults, ...meetingResults];
  }, [staticCommands, taskResults, meetingResults, q]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function execute(cmd: Command) {
    cmd.run();
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) execute(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4"
      style={{ background: "var(--tf-overlay)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}
      >
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
          <Search size={15} style={{ color: "var(--tf-ink-muted)" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, meetings, or run a command..."
            aria-label="Command search"
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: "var(--tf-ink)" }}
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ color: "var(--tf-ink-muted)", border: "1px solid var(--tf-panel-border)" }}>
            Esc
          </kbd>
        </div>

        <div className="tf-scroll max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="text-[13px] text-center py-8" style={{ color: "var(--tf-ink-muted)" }}>
              No matching commands, tasks, or meetings.
            </p>
          )}

          {GROUP_ORDER.map((group) => {
            const items = filtered.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="px-2 mb-1">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--tf-ink-muted)" }}>
                  {group}
                </div>
                {items.map((cmd) => {
                  const globalIndex = filtered.indexOf(cmd);
                  const active = globalIndex === activeIndex;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left text-[13px] transition-colors"
                      style={{ background: active ? "rgba(37,99,235,0.12)" : "transparent", color: "var(--tf-ink)" }}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="shrink-0" style={{ color: active ? "var(--tf-primary)" : "var(--tf-ink-muted)" }}>
                          {cmd.icon}
                        </span>
                        <span className="truncate">{cmd.label}</span>
                      </span>
                      {active && <CornerDownLeft size={13} className="shrink-0" style={{ color: "var(--tf-ink-muted)" }} />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
