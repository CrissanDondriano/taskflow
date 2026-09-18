import { useState } from "react";
import { KanbanBoard } from "../../components/kanban/KanbanBoard";
import { TaskDetailModal } from "../../components/kanban/TaskDetailModal";
import { NewTaskModal } from "../../components/dashboard/NewTaskModal";
import { QuickAddBar } from "../../components/ai/QuickAddBar";
import { PriorityLegend } from "../../components/ui/PriorityLegend";
import { useTasks } from "../../context/TasksContext";
import type { Task, TaskColumn } from "../../types";

export function KanbanPage() {
  const { tasks, moveTask, addTask, updateTask, deleteTask } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalColumn, setModalColumn] = useState<TaskColumn>("Backlog");
  const [openTask, setOpenTask] = useState<Task | null>(null);

  function handleAddTask(column: TaskColumn) {
    setModalColumn(column);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={addTask} defaultColumn={modalColumn} />
      <TaskDetailModal task={openTask} onClose={() => setOpenTask(null)} onSave={updateTask} onDelete={deleteTask} />
      <QuickAddBar onCreate={addTask} />
      <PriorityLegend />
      <KanbanBoard tasks={tasks} onMove={moveTask} onAddTask={handleAddTask} onOpenTask={setOpenTask} onDeleteTask={deleteTask} />
    </div>
  );
}
