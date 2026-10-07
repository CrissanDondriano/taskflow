import { useState } from "react";
import { KanbanBoard } from "../../components/kanban/KanbanBoard";
import { TaskDetailModal } from "../../components/kanban/TaskDetailModal";
import { NewTaskModal } from "../../components/dashboard/NewTaskModal";
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

  function handleAddTask(column: TaskColumn) {
    setModalColumn(column);
    setModalOpen(true);
  }

  function handleDeleteTask(id: string) {
    deleteTask(id);
    toast("Task deleted.", "info", { label: "Undo", run: undoDelete });
  }

  return (
    <div className="flex flex-col gap-4">
      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={addTask} defaultColumn={modalColumn} />
      <TaskDetailModal task={openTask} onClose={() => setOpenTask(null)} onSave={updateTask} onDelete={handleDeleteTask} />
      <QuickAddBar onCreate={addTask} />
      <PriorityLegend />
      <KanbanBoard tasks={tasks} onMove={moveTask} onAddTask={handleAddTask} onOpenTask={setOpenTask} onDeleteTask={handleDeleteTask} />
    </div>
  );
}
