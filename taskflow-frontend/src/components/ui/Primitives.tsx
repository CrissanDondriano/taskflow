import type { ReactNode, CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Badge } from "./Badge";
import { PRIORITY_HEX } from "../../data/mockData";

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
      className={`rounded-2xl backdrop-blur-xl ${className}`}
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
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--tf-overlay)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto tf-scroll"
            style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)" }}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ color: "var(--tf-ink-muted)" }}
              >
                <X size={15} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge color={PRIORITY_HEX[priority] ?? "var(--tf-ink-muted)"}>{priority}</Badge>;
}

export function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 py-16" style={{ color: "var(--tf-ink-muted)" }}>
      {icon}
      <p className="text-[13px] text-center max-w-xs">{message}</p>
    </div>
  );
}
