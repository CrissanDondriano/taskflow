import { useTasksStore } from "../stores/tasksStore";

/**
 * Public hook for task state. The state itself now lives in the Zustand
 * tasks store (src/stores/tasksStore.ts) — no React context or provider
 * needed — but consumers keep calling useTasks() exactly as before.
 */
export function useTasks() {
  return useTasksStore();
}
