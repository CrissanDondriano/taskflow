interface SkeletonProps {
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Shimmering loading placeholder. Used by MeetingNotesConverter while it
 * extracts a summary/action items (the one genuine async wait in the UI).
 * The dashboard/kanban/calendar pages still run on local state with no
 * fetches to wait for (see README: Phase 2 API wiring), so the card/stat
 * presets below are ready for when those become async.
 */
export function Skeleton({ variant = "rect", width, height, className = "" }: SkeletonProps) {
  const radius = variant === "circle" ? "9999px" : variant === "text" ? "6px" : "12px";
  const defaultHeight = variant === "text" ? "0.9em" : "100%";

  return (
    <div
      className={`tf-skeleton ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? defaultHeight,
        borderRadius: radius,
      }}
      aria-hidden="true"
    />
  );
}

/** Convenience preset: a stat-card-shaped skeleton, matching StatCard's dimensions. */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
      <Skeleton variant="text" width="60%" height={11} className="mb-3" />
      <Skeleton variant="text" width="40%" height={26} />
    </div>
  );
}
