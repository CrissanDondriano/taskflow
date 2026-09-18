import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  // On first load, if a token is already stored, fetch the current user
  // so a page refresh doesn't kick you back to the login screen.
  useEffect(() => {
    const token = localStorage.getItem("taskflow_token");
    if (!token) {
      setBootstrapping(false);
      return;
    }
    api
      .get<AuthUser>("/me")
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("taskflow_token");
      })
      .finally(() => setBootstrapping(false));
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ user: AuthUser; token: string }>("/login", {
        email,
        password,
      });
      localStorage.setItem("taskflow_token", data.token);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong logging in.");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function signup(name: string, email: string, password: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ user: AuthUser; token: string }>("/register", {
        name,
        email,
        password,
        password_confirmation: password,
      });
      localStorage.setItem("taskflow_token", data.token);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong signing up.");
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    api.post("/logout").catch(() => {
      /* best-effort; clear local state regardless */
    });
    localStorage.removeItem("taskflow_token");
    setUser(null);
  }

  function clearError() {
    setError(null);
  }

  if (bootstrapping) {
    return null; // avoid a flash of the login page while we check for a saved session
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
