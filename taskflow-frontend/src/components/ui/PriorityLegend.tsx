import { PRIORITY_HEX } from "../../data/mockData";

/**
 * A small reference key explaining what each priority color means.
 * Shown consistently across Dashboard, Kanban, Calendar, and Meeting Notes
 * so the color coding never has to be guessed at.
 */
export function PriorityLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {Object.entries(PRIORITY_HEX).map(([label, color]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}` }} />
          <span className="text-[11px]" style={{ color: "var(--tf-ink-muted)" }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
