import { useShallow } from "zustand/react/shallow";
import { useTasksStore } from "../stores/tasksStore";

/**
 * Public hook for task state. The state itself now lives in the Zustand
 * tasks store (src/stores/tasksStore.ts) — no React context or provider
 * needed — but consumers keep calling useTasks() exactly as before.
 */
export function useTasks() {
  return useTasksStore();
}

/**
 * Actions without the data: for components that only *write* tasks (the
 * shell's New-task modal, meeting notes). Subscribing to the stable action
 * identities means task edits elsewhere no longer re-render the whole
 * dashboard shell — useTasks() stays for components that genuinely display
 * task data.
 */
export function useTaskActions() {
  return useTasksStore(
    useShallow((s) => ({
      addTask: s.addTask,
      moveTask: s.moveTask,
      updateTask: s.updateTask,
      deleteTask: s.deleteTask,
      undoDelete: s.undoDelete,
    }))
  );
}

/** Loading flag only — for the shell's first-load gate without subscribing to task data. */
export function useTasksLoading() {
  return useTasksStore((s) => s.loading);
}

/** Task list only — for components that only *read* tasks. */
export function useTasksData() {
  return useTasksStore((s) => s.tasks);
}
