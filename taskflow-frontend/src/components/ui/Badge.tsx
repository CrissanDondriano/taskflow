import type { ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  /** Drives the fill and border (the badge's hue). */
  color?: string;
  /**
   * Text color, when it must differ from the hue — e.g. priority badges keep
   * a bright hex fill but draw text from a theme token (--tf-warning-text)
   * so it passes 4.5:1 on white and on dark surfaces alike. Defaults to the hue.
   */
  textColor?: string;
  variant?: "soft" | "solid";
  className?: string;
}

/**
 * Generic color-based badge. PriorityBadge (in Primitives.tsx) is a thin
 * wrapper around this for the Low/Medium/High/Critical case specifically —
 * use Badge directly for anything else (status, category, labels).
 */
export function Badge({ children, color = "var(--tf-ink-muted)", textColor, variant = "soft", className = "" }: BadgeProps) {
  const ink = textColor ?? color;
  const style =
    variant === "solid"
      ? { background: color, color: ink }
      : { background: `color-mix(in srgb, ${color} 12%, transparent)`, color: ink, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` };

  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${className}`} style={style}>
      {children}
    </span>
  );
}
