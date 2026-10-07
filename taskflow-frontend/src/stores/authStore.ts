import { create } from "zustand";
import { api, ApiError } from "../lib/api";
import type { AuthUser } from "../types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  /** Restores a saved session on first load (called once by AuthProvider). */
  bootstrap: () => Promise<void>;
}

/**
 * Auth state outside React. The public hook `useAuth()` still lives in
 * context/AuthContext so consumer imports don't change; AuthProvider remains
 * only as the one-time bootstrap gate (loading screen while /me is checked).
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: false,
  error: null,
  bootstrapping: true,

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const data = await api.post<{ user: AuthUser; token: string }>("/login", {
        email,
        password,
      });
      localStorage.setItem("taskflow_token", data.token);
      set({ user: data.user });
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : "Something went wrong logging in." });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  async signup(name, email, password) {
    set({ loading: true, error: null });
    try {
      const data = await api.post<{ user: AuthUser; token: string }>("/register", {
        name,
        email,
        password,
        password_confirmation: password,
      });
      localStorage.setItem("taskflow_token", data.token);
      set({ user: data.user });
    } catch (err) {
      set({ error: err instanceof ApiError ? err.message : "Something went wrong signing up." });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  logout() {
    api.post("/logout").catch(() => {
      /* best-effort; clear local state regardless */
    });
    localStorage.removeItem("taskflow_token");
    set({ user: null });
  },

  clearError() {
    set({ error: null });
  },

  async bootstrap() {
    const token = localStorage.getItem("taskflow_token");
    if (!token) {
      set({ bootstrapping: false });
      return;
    }
    try {
      const user = await api.get<AuthUser>("/me");
      set({ user, bootstrapping: false });
    } catch {
      localStorage.removeItem("taskflow_token");
      set({ bootstrapping: false });
    }
  },
}));
