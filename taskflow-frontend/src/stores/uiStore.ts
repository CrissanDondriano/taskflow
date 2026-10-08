import { create } from "zustand";

/**
 * UI overlay state (which modal/drawer is open). Kept in a tiny store so
 * opening an overlay re-renders only the overlay itself — never the shell,
 * sidebar, topbar, or the page underneath. Triggers call openModal(id);
 * the overlay component subscribes to activeModal and renders accordingly.
 */
interface UIState {
  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;
  toggleModal: (id: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  toggleModal: (id) => set((s) => ({ activeModal: s.activeModal === id ? null : id })),
}));
