import { createContext, useContext, useState, type ReactNode } from "react";
import type { Task, TaskColumn } from "../types";

interface TasksContextValue {
  tasks: Task[];
  addTask: (task: Task) => void;
  moveTask: (id: string, column: TaskColumn) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  function addTask(task: Task) {
    setTasks((prev) => [...prev, task.column === "Completed" ? { ...task, completedAt: task.completedAt ?? new Date().toISOString() } : task]);
  }

  function moveTask(id: string, column: TaskColumn) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const justCompleted = column === "Completed" && t.column !== "Completed";
        return { ...t, column, completedAt: justCompleted ? new Date().toISOString() : t.completedAt };
      })
    );
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const justCompleted = patch.column === "Completed" && t.column !== "Completed";
        return { ...t, ...patch, completedAt: justCompleted ? new Date().toISOString() : patch.completedAt ?? t.completedAt };
      })
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return <TasksContext.Provider value={{ tasks, addTask, moveTask, updateTask, deleteTask }}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within a TasksProvider");
  return ctx;
}
