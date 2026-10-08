import { Check, AlertTriangle, Info, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "../stores/toastStore";

const VARIANT_STYLE: Record<ToastVariant, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <Check size={14} />, accent: "var(--tf-teal)" },
  error: { icon: <AlertTriangle size={14} />, accent: "var(--tf-danger)" },
  info: { icon: <Info size={14} />, accent: "var(--tf-primary)" },
};

/**
 * Public hook for showing toast notifications (transient action feedback:
 * saved, connected, failed...). State lives in the Zustand toast store;
 * the visual region is rendered by <Toaster />.
 */
export function useToast() {
  return useToastStore();
}

/**
 * Fixed-position toast region. Renders every toast from the store and
 * announces each message to screen readers (role="status" / aria-live).
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[1100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((t) => {
        const v = VARIANT_STYLE[t.variant];
        const action = t.action;
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 shadow-lg"
            style={{
              background: "var(--tf-surface)",
              border: "1px solid var(--tf-panel-border)",
              borderLeft: `3px solid ${v.accent}`,
              boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: v.accent }}>
              {v.icon}
            </span>
            <p className="flex-1 text-[13px] leading-snug" style={{ color: "var(--tf-ink)" }}>
              {t.message}
            </p>
            {action && (
              <button
                onClick={() => {
                  action.run();
                  dismiss(t.id);
                }}
                className="shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md transition-colors hover:bg-white/5"
                style={{ color: v.accent }}
              >
                {action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 -mt-0.5 -mr-1 w-5 h-5 rounded-md flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ color: "var(--tf-ink-muted)" }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
