interface SkeletonProps {
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Shimmering loading placeholder. Not wired into any page yet — there's no
 * real async data-fetching in the app to justify a loading state (see
 * README: Dashboard/Kanban/Calendar still run on local mock data). This
 * gets used for real once Phase 2 wires the Dashboard to live API calls;
 * faking a timeout just to show it off would be the same "temporary data"
 * problem already flagged and fixed elsewhere in this app.
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

/** Convenience preset: a kanban-card-shaped skeleton. */
export function SkeletonCard() {
  return (
    <div className="rounded-xl p-3" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)" }}>
      <Skeleton variant="text" width="40%" height={10} className="mb-2" />
      <Skeleton variant="text" width="90%" height={13} className="mb-1" />
      <Skeleton variant="text" width="70%" height={13} className="mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton variant="rect" width={50} height={16} />
        <Skeleton variant="circle" width={22} height={22} />
      </div>
    </div>
  );
}
