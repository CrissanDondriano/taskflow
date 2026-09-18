import { useMemo } from "react";
import type { Task, Priority } from "../../types";
import { PRIORITY_HEX } from "../../data/mockData";

const ORBIT_RINGS: { priority: Priority; radius: number }[] = [
  { priority: "Critical", radius: 34 },
  { priority: "High", radius: 58 },
  { priority: "Medium", radius: 82 },
  { priority: "Low", radius: 106 },
];

const SIZE = 240;

/**
 * Compact urgency radar — deliberately smaller and quieter than the first
 * version. It's paired with UrgencyList (rendered alongside it in
 * DashboardHome) rather than trying to be the only way to read the data:
 * the radar gives an at-a-glance shape, the list gives an actually
 * scannable, accessible way to find and act on a specific task.
 */
export function MissionOrbit({
  tasks,
  onSelect,
  selectedId,
  hoveredId,
  onHover,
}: {
  tasks: Task[];
  onSelect: (task: Task) => void;
  selectedId?: string;
  hoveredId?: string;
  onHover?: (id: string | undefined) => void;
}) {
  const nodesByPriority = useMemo(() => {
    const map: Record<string, Task[]> = {};
    ORBIT_RINGS.forEach((r) => (map[r.priority] = []));
    tasks.forEach((t) => {
      if (t.column !== "Completed" && map[t.priority]) map[t.priority].push(t);
    });
    return map;
  }, [tasks]);

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const overallHealth = 84;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[240px] mx-auto h-auto" role="img" aria-label="Task urgency radar">
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#2563EB" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {ORBIT_RINGS.map((r) => (
        <circle key={r.priority} cx={cx} cy={cy} r={r.radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="2 5" />
      ))}

      <circle cx={cx} cy={cy} r={20} fill="url(#coreGlow)" className="orbit-core-pulse" />
      <circle cx={cx} cy={cy} r={12} fill="var(--tf-surface)" stroke="#14B8A6" strokeWidth={1.5} />
      <text x={cx} y={cy + 2} textAnchor="middle" fill="var(--tf-ink)" fontSize={9} fontWeight={700} fontFamily="'Space Grotesk', sans-serif">
        {overallHealth}%
      </text>

      {Object.entries(nodesByPriority).map(([priority, list]) => {
        const ring = ORBIT_RINGS.find((r) => r.priority === priority)!;
        return list.map((task, i) => {
          const angle = ((i + 0.5) / list.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + ring.radius * Math.cos(angle);
          const y = cy + ring.radius * Math.sin(angle);
          const color = PRIORITY_HEX[priority];
          const isSelected = task.id === selectedId;
          const isHovered = task.id === hoveredId;
          const active = isSelected || isHovered;
          return (
            <g
              key={task.id}
              onClick={() => onSelect(task)}
              onMouseEnter={() => onHover?.(task.id)}
              onMouseLeave={() => onHover?.(undefined)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`${task.title}, ${task.priority} priority, due ${task.due}`}
              onKeyDown={(e) => e.key === "Enter" && onSelect(task)}
            >
              <title>{`${task.title} — ${task.priority}, due ${task.due}`}</title>
              {task.atRisk && <circle cx={x} cy={y} r={9} fill="none" stroke={color} strokeWidth={1.5} className="orbit-risk-ring" />}
              <circle
                cx={x}
                cy={y}
                r={active ? 7 : 5}
                fill={color}
                stroke={active ? "#fff" : "none"}
                strokeWidth={1.5}
                style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "r 0.15s" }}
              />
            </g>
          );
        });
      })}
    </svg>
  );
}
