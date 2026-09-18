import { useState, useId, type ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
}

/**
 * Lightweight hover/focus tooltip. No portal/positioning library — for the
 * icon-only buttons this wraps (theme toggle, command palette trigger),
 * a simple absolutely-positioned span is sufficient and avoids pulling in
 * a dependency for something this small.
 */
export function Tooltip({ label, children, side = "bottom" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          id={id}
          className={`absolute left-1/2 -translate-x-1/2 z-50 px-2 py-1 rounded-lg text-[11px] whitespace-nowrap pointer-events-none ${
            side === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
          }`}
          style={{ background: "var(--tf-surface)", color: "var(--tf-ink)", border: "1px solid var(--tf-panel-border)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
