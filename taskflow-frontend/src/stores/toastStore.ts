import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  /** Optional inline action (e.g. "Undo" after a delete). */
  action?: ToastAction;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (message: string, variant?: ToastVariant, action?: ToastAction) => void;
  dismiss: (id: number) => void;
}

const AUTO_DISMISS_MS = 4000;
const WITH_ACTION_MS = 8000;
const timers = new Map<number, number>();
let nextId = 1;

/** Transient action feedback (saved, connected, failed...). Rendered by <Toaster />. */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  toast(message, variant = "info", action) {
    const id = nextId++;
    set((prev) => ({ toasts: [...prev.toasts, { id, message, variant, action }] }));
    timers.set(
      id,
      window.setTimeout(() => {
        timers.delete(id);
        set((prev) => ({ toasts: prev.toasts.filter((t) => t.id !== id) }));
      }, action ? WITH_ACTION_MS : AUTO_DISMISS_MS)
    );
  },

  dismiss(id) {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    set((prev) => ({ toasts: prev.toasts.filter((t) => t.id !== id) }));
  },
}));
