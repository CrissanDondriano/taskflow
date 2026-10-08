import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { PRIORITY_HEX } from "../../data/mockData";
import type { Priority } from "../../types";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Order of open dialogs. Nested cases (ConfirmDialog inside TaskDetailModal)
 * must let only the topmost instance react to Escape — otherwise one keypress
 * would close every layer at once. Module scope survives per-instance renders;
 * entries are removed in effect cleanups, so it can't leak.
 */
const openDialogs: symbol[] = [];

export function GlassPanel({
  children,
  className = "",
  style = {},
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)", ...style }}
    >
      {children}
    </div>
  );
}

export function PulseCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ai-pulse-wrap p-5 ${className}`} style={{ background: "var(--tf-surface)" }}>
      {children}
    </div>
  );
}

export function Avatar({
  initials,
  color,
  size = 28,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0 font-mono"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38, boxShadow: `0 0 12px ${color}66` }}
      title={initials}
    >
      {initials}
    </div>
  );
}

export function Eyebrow({ children, color = "#14B8A6" }: { children: ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="text-[10px] font-mono tracking-[0.18em] uppercase" style={{ color: "var(--tf-ink-muted)" }}>
        {children}
      </span>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Review-table style dialogs need room — max-w-4xl instead of max-w-md. */
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // Focus management + scroll lock while open: move focus into the dialog
  // (unless something inside it is already focused — inputs use autoFocus),
  // lock background scrolling, and return focus to the trigger on close.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    const active = document.activeElement;
    if (dialog && !dialog.contains(active)) {
      const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? dialog).focus();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open]);

  // Escape closes the topmost open dialog only (see openDialogs stack).
  useEffect(() => {
    if (!open) return;

    const token = Symbol("dialog");
    openDialogs.push(token);

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (openDialogs[openDialogs.length - 1] !== token) return;
      onClose();
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = openDialogs.indexOf(token);
      if (i !== -1) openDialogs.splice(i, 1);
    };
  }, [open, onClose]);

  // Keep Tab inside the dialog: wrap from last to first (and Shift+Tab back).
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length === 0) {
      e.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Portal to document.body: keeps the overlay out of glass/blurred
  // ancestors (which create stacking contexts) and out of the page's
  // render subtree, so opening a modal never re-renders the page behind it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--tf-overlay)" }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trapTab}
            className={`w-full ${wide ? "max-w-4xl" : "max-w-md"} rounded-2xl p-5 max-h-[90vh] overflow-y-auto tf-scroll`}
            style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                style={{ color: "var(--tf-ink-muted)" }}
              >
                <X size={15} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge color={PRIORITY_HEX[priority] ?? "var(--tf-ink-muted)"}>{priority}</Badge>;
}

export function EmptyState({ icon, message, action }: { icon: ReactNode; message: string; action?: ReactNode }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 py-16" style={{ color: "var(--tf-ink-muted)" }}>
      {icon}
      <p className="text-[13px] text-center max-w-xs">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/**
 * Labelled form field with optional leading icon, error state and full
 * aria wiring (label → input, error → aria-invalid + aria-describedby).
 * One implementation for the auth forms so spacing, focus and error
 * styling stay identical everywhere.
 */
export function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  icon,
  error,
  hintId,
  required,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  icon?: ReactNode;
  error?: string;
  /** id of extra helper text to link via aria-describedby (e.g. password rules). */
  hintId?: string;
  required?: boolean;
  /** helper content rendered under the input (e.g. live password rules). */
  children?: ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--tf-ink-muted)" }} aria-hidden="true">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hintId}
          placeholder={placeholder}
          className={`w-full text-[13px] ${icon ? "pl-9" : "pl-3"} pr-3 py-2.5 rounded-xl outline-none`}
          style={{
            background: "var(--tf-fill-04)",
            border: `1px solid ${error ? "var(--tf-danger)" : "var(--tf-panel-border)"}`,
            color: "var(--tf-ink)",
          }}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-[11px] mt-1" style={{ color: "var(--tf-danger-text)" }}>
          {error}
        </p>
      )}
      {children}
    </div>
  );
}

/**
 * Confirmation step for destructive actions (delete task, remove member...).
 * Renders its own Modal overlay, so it can sit on top of an open detail
 * modal without either component needing to know about the other.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-snug" style={{ color: "var(--tf-ink-muted)" }}>
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
