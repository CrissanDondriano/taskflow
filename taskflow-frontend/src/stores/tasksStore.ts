import { create } from "zustand";
import type { Task, TaskColumn } from "../types";

interface TasksState {
  tasks: Task[];
  addTask: (task: Task) => void;
  moveTask: (id: string, column: TaskColumn) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}

/** Task state + actions, migrated from context/TasksContext to Zustand. */
export const useTasksStore = create<TasksState>()((set) => ({
  tasks: [],

  addTask(task) {
    set((prev) => ({
      tasks: [...prev.tasks, task.column === "Completed" ? { ...task, completedAt: task.completedAt ?? new Date().toISOString() } : task],
    }));
  },

  moveTask(id, column) {
    set((prev) => ({
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const justCompleted = column === "Completed" && t.column !== "Completed";
        return { ...t, column, completedAt: justCompleted ? new Date().toISOString() : t.completedAt };
      }),
    }));
  },

  updateTask(id, patch) {
    set((prev) => ({
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const justCompleted = patch.column === "Completed" && t.column !== "Completed";
        return { ...t, ...patch, completedAt: justCompleted ? new Date().toISOString() : patch.completedAt ?? t.completedAt };
      }),
    }));
  },

  deleteTask(id) {
    set((prev) => ({ tasks: prev.tasks.filter((t) => t.id !== id) }));
  },
}));
