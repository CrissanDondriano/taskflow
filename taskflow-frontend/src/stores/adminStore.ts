import { create } from "zustand";
import { api, ApiError } from "../lib/api";
import type { AdminStats, AdminUser, AuditLogEntry, AuthUser } from "../types";

interface AdminState {
  stats: AdminStats | null;
  users: AdminUser[];
  logs: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  /** Fetches stats, the user directory and the audit trail in one go. */
  fetchAll: () => Promise<void>;
  /** Changes a user's role; returns false (and its message) on failure. */
  setRole: (userId: number, role: AuthUser["role"]) => Promise<boolean>;
  /** Clears everything on logout so the next account starts fresh. */
  reset: () => void;
}

/**
 * Admin console data — platform stats, the user directory with role
 * editing, and the audit trail. Backed by the /admin endpoints, which are
 * gated by the EnsureAdmin middleware on the API side.
 */
export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  users: [],
  logs: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [stats, users, logs] = await Promise.all([
        api.get<AdminStats>("/admin/stats"),
        api.get<{ data: AdminUser[] }>("/admin/users"),
        api.get<{ data: AuditLogEntry[] }>("/admin/audit-logs"),
      ]);
      set({ stats, users: users.data, logs: logs.data, loading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not load admin data.";
      set({ error: message, loading: false });
    }
  },

  setRole: async (userId, role) => {
    try {
      const updated = await api.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
      set({ users: get().users.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)) });
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not change the role.";
      set({ error: message });
      return false;
    }
  },

  reset: () => set({ stats: null, users: [], logs: [], loading: false, error: null }),
}));
