import { useCallback, useMemo, useState } from "react";
import { Check, FileUp, Plus, SlidersHorizontal } from "lucide-react";
import { KanbanBoard } from "../../components/kanban/KanbanBoard";
import { TaskDetailModal } from "../../components/kanban/TaskDetailModal";
import { NewTaskModal } from "../../components/dashboard/NewTaskModal";
import { PlanImportModal } from "../../components/plan-import/PlanImportModal";
import { QuickAddBar } from "../../components/ai/QuickAddBar";
import { GlassPanel } from "../../components/ui/Primitives";
import { DropdownMenu } from "../../components/ui/DropdownMenu";
import { COLUMNS, PRIORITIES } from "../../data/mockData";
import { parseDueToAnchorDay } from "../../lib/calendar";
import { useTasksData, useTaskActions } from "../../context/TasksContext";
import { useToast } from "../../context/ToastContext";
import type { Priority, Task, TaskColumn } from "../../types";

type SortKey = "due" | "priority" | "newest";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "due", label: "Due date" },
  { key: "priority", label: "Priority" },
  { key: "newest", label: "Newest first" },
];

const PRIORITY_ORDER: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

function sortTasks(list: Task[], sort: SortKey) {
  const copy = [...list];
  if (sort === "priority") return copy.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  if (sort === "newest") {
    return copy.sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }
  return copy.sort((a, b) => (parseDueToAnchorDay(a.due) ?? 99) - (parseDueToAnchorDay(b.due) ?? 99));
}

export function KanbanPage() {
  const tasks = useTasksData();
  const { moveTask, addTask, updateTask, deleteTask, undoDelete } = useTaskActions();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalColumn, setModalColumn] = useState<TaskColumn>("Backlog");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filter, setFilter] = useState<TaskColumn | "all">("all");
  const [sort, setSort] = useState<SortKey>("due");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");

  // Stable callbacks: KanbanBoard is memoized, so these identities must not
  // change on unrelated renders (e.g. opening the detail modal) or every
  // card re-renders with it.
  const handleAddTask = useCallback((column: TaskColumn) => {
    setModalColumn(column);
    setModalOpen(true);
  }, []);

  const handleDeleteTask = useCallback(
    (id: string) => {
      deleteTask(id);
      toast("Task deleted.", "info", { label: "Undo", run: undoDelete });
    },
    [deleteTask, toast, undoDelete]
  );

  const priorityFiltered = useMemo(
    () => (priorityFilter === "all" ? tasks : tasks.filter((t) => t.priority === priorityFilter)),
    [tasks, priorityFilter]
  );

  const visibleTasks = useMemo(() => sortTasks(priorityFiltered, sort), [priorityFiltered, sort]);

  const tabs = useMemo(
    () => [
      { key: "all" as const, label: "All tasks", count: priorityFiltered.length },
      ...COLUMNS.map((c) => ({
        key: c,
        label: c,
        count: priorityFiltered.filter((t) => t.column === c).length,
      })),
    ],
    [priorityFiltered]
  );

  const columns = filter === "all" ? COLUMNS : [filter];

  return (
    <div className="flex flex-col gap-4">
      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={addTask} defaultColumn={modalColumn} />
      <TaskDetailModal task={openTask} onClose={() => setOpenTask(null)} onSave={updateTask} onDelete={handleDeleteTask} />
      <PlanImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <GlassPanel className="p-3 sm:p-4">
        {/* ---------- Toolbar ---------- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="flex items-center gap-0.5 p-1 rounded-xl overflow-x-auto tf-scroll max-w-full"
            style={{ background: "var(--tf-fill-03)" }}
            role="group"
            aria-label="Filter by column"
          >
            {tabs.map((t) => {
              const active = filter === t.key;
              return (
                <button
                  key={t.key}
                  aria-pressed={active}
                  onClick={() => setFilter(t.key)}
                  className="flex items-center gap-1.5 h-8 px-2 rounded-lg text-[12px] whitespace-nowrap transition-colors"
                  style={{
                    background: active ? "var(--tf-fill-12)" : "transparent",
                    color: active ? "var(--tf-ink)" : "var(--tf-ink-muted)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {t.label}
                  <span
                    className="text-[10.5px] font-mono leading-none"
                    style={{ color: active ? "var(--tf-ink-soft)" : "var(--tf-ink-muted)", opacity: active ? 1 : 0.8 }}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[12px] font-medium transition-colors hover:bg-white/5"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-soft)" }}
            >
              <FileUp size={13} aria-hidden="true" /> Import plan
            </button>

            <DropdownMenu
              trigger={
                <button
                  className="flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[12px] font-medium transition-colors hover:bg-white/5"
                  style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-soft)" }}
                >
                  <SlidersHorizontal size={13} aria-hidden="true" /> Filter &amp; sort
                </button>
              }
              groups={[
                {
                  label: "Sort by",
                  items: SORTS.map((s) => ({
                    label: s.label,
                    icon: sort === s.key ? <Check size={12} /> : <span className="w-3" />,
                    onSelect: () => setSort(s.key),
                  })),
                },
                {
                  label: "Priority",
                  items: [
                    {
                      label: "All priorities",
                      icon: priorityFilter === "all" ? <Check size={12} /> : <span className="w-3" />,
                      onSelect: () => setPriorityFilter("all"),
                    },
                    ...PRIORITIES.map((p) => ({
                      label: p,
                      icon: priorityFilter === p ? <Check size={12} /> : <span className="w-3" />,
                      onSelect: () => setPriorityFilter(p),
                    })),
                  ],
                },
              ]}
            />

            <button
              onClick={() => handleAddTask(filter === "all" ? "Backlog" : filter)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--tf-primary)", color: "#fff", boxShadow: "0 0 16px rgba(37,99,235,0.35)" }}
            >
              <Plus size={13} aria-hidden="true" /> Add new task
            </button>
          </div>
        </div>

        {/* ---------- AI quick add ---------- */}
        <div className="mt-3">
          <QuickAddBar onCreate={addTask} />
        </div>

        {/* ---------- Board ---------- */}
        <div className="mt-4">
          <KanbanBoard
            tasks={visibleTasks}
            columns={columns}
            onMove={moveTask}
            onAddTask={handleAddTask}
            onOpenTask={setOpenTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </GlassPanel>
    </div>
  );
}
