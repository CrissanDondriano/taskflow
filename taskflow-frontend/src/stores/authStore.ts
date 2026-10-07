import { create } from "zustand";
import { api, ApiError } from "../lib/api";
import { useAdminStore } from "./adminStore";
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
  /** Persists profile edits (PATCH /me) and swaps the user in on success. */
  updateProfile: (name: string, email: string) => Promise<void>;
  /** Permanently deletes the account (DELETE /me, password-confirmed). */
  deleteAccount: (password: string) => Promise<void>;
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
    // Admin data is account-scoped and privileged: wiping it here stops the
    // next login from rendering the previous account's user directory and
    // audit trail from cache (adminStore.reset was previously never called).
    useAdminStore.getState().reset();
  },

  clearError() {
    set({ error: null });
  },

  async updateProfile(name, email) {
    const user = await api.patch<AuthUser>("/me", { name, email });
    set({ user });
  },

  async deleteAccount(password) {
    await api.delete("/me", { password });
    // Same cleanup as logout, minus the POST /logout — the server already
    // revoked every token for this account inside the DELETE call.
    localStorage.removeItem("taskflow_token");
    set({ user: null });
    useAdminStore.getState().reset();
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
    } catch (err) {
      // Only discard the session when the server explicitly rejects the
      // token (401/403). Transient failures — MySQL restarting, the API
      // server bouncing, a network blip — must not destroy a valid login;
      // keeping the token lets the next load restore the session.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem("taskflow_token");
      }
      set({ bootstrapping: false });
    }
  },
}));
