import { useCallback, useState } from "react";
import { FileUp } from "lucide-react";
import { KanbanBoard } from "../../components/kanban/KanbanBoard";
import { TaskDetailModal } from "../../components/kanban/TaskDetailModal";
import { NewTaskModal } from "../../components/dashboard/NewTaskModal";
import { PlanImportModal } from "../../components/plan-import/PlanImportModal";
import { QuickAddBar } from "../../components/ai/QuickAddBar";
import { PriorityLegend } from "../../components/ui/PriorityLegend";
import { useTasksData, useTaskActions } from "../../context/TasksContext";
import { useToast } from "../../context/ToastContext";
import type { Task, TaskColumn } from "../../types";

export function KanbanPage() {
  const tasks = useTasksData();
  const { moveTask, addTask, updateTask, deleteTask, undoDelete } = useTaskActions();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalColumn, setModalColumn] = useState<TaskColumn>("Backlog");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [importOpen, setImportOpen] = useState(false);

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

  return (
    <div className="flex flex-col gap-4">
      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={addTask} defaultColumn={modalColumn} />
      <TaskDetailModal task={openTask} onClose={() => setOpenTask(null)} onSave={updateTask} onDelete={handleDeleteTask} />
      <PlanImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <QuickAddBar onCreate={addTask} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PriorityLegend />
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
          style={{ borderColor: "var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
        >
          <FileUp size={13} /> Import plan
        </button>
      </div>
      <KanbanBoard tasks={tasks} onMove={moveTask} onAddTask={handleAddTask} onOpenTask={setOpenTask} onDeleteTask={handleDeleteTask} />
    </div>
  );
}
