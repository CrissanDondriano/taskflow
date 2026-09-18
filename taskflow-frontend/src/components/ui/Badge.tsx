import type { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  color?: string;
  variant?: "soft" | "solid";
  className?: string;
}

/**
 * Generic color-based badge. PriorityBadge (in Primitives.tsx) is a thin
 * wrapper around this for the Low/Medium/High/Critical case specifically —
 * use Badge directly for anything else (status, category, labels).
 */
export function Badge({ children, color = "var(--tf-ink-muted)", variant = "soft", className = "" }: BadgeProps) {
  const style =
    variant === "solid"
      ? { background: color, color: "white" }
      : { background: `color-mix(in srgb, ${color} 12%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` };

  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${className}`} style={style}>
      {children}
    </span>
  );
}
