import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

const AUTO_DISMISS_MS = 4000;
const timers = new Map<number, number>();
let nextId = 1;

/** Transient action feedback (saved, connected, failed...). Rendered by <Toaster />. */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  toast(message, variant = "info") {
    const id = nextId++;
    set((prev) => ({ toasts: [...prev.toasts, { id, message, variant }] }));
    timers.set(
      id,
      window.setTimeout(() => {
        timers.delete(id);
        set((prev) => ({ toasts: prev.toasts.filter((t) => t.id !== id) }));
      }, AUTO_DISMISS_MS)
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
