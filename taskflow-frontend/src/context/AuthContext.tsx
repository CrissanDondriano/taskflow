import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "../stores/authStore";
import { LoadingScreen } from "../components/ui/LoadingScreen";

/**
 * Public hook for auth state (user, login, signup, logout, error...).
 * The state now lives in the Zustand auth store — no React context —
 * but consumers keep calling useAuth() exactly as before.
 */
export function useAuth() {
  return useAuthStore();
}

/**
 * Bootstrap gate over the auth store: restores a saved session once on
 * app load and shows the loading screen while that check is in flight,
 * so a page refresh doesn't flash the login page. (The store holds the
 * actual state; this component only runs the one-time check.)
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const bootstrapping = useAuthStore((s) => s.bootstrapping);

  useEffect(() => {
    void useAuthStore.getState().bootstrap();
  }, []);

  if (bootstrapping) {
    return <LoadingScreen label="Restoring your session..." />;
  }

  return <>{children}</>;
}
