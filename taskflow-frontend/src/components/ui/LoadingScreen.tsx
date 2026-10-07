import { Loader2 } from "lucide-react";

/**
 * Full-screen branded loading state. Used where the app previously rendered
 * nothing at all: while AuthProvider restores a saved session on refresh, and
 * as the Suspense fallback while a lazy-loaded route chunk is fetched.
 */
export function LoadingScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen w-full flex flex-col items-center justify-center gap-3"
      style={{ background: "var(--tf-void)" }}
    >
      <Loader2 size={22} className="animate-spin" style={{ color: "var(--tf-teal)" }} />
      <p className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>
        {label}
      </p>
    </div>
  );
}
