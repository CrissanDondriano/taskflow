import { Sparkles } from "lucide-react";
import { PulseCard, Eyebrow } from "../ui/Primitives";
import type { Person, Task } from "../../types";

/**
 * A single AI recommendation, genuinely computed from the workload spread
 * across the team and each overloaded person's Backlog items — not a
 * canned string. Returns null (and the panel renders nothing) if the team
 * is already balanced, rather than manufacturing a recommendation to fill space.
 */
function computeRecommendation(people: Person[], tasks: Task[]): string | null {
  if (people.length < 2) return null;
  const sorted = [...people].sort((a, b) => b.workloadPct - a.workloadPct);
  const busiest = sorted[0];
  const freest = sorted[sorted.length - 1];
  const gap = busiest.workloadPct - freest.workloadPct;
  if (gap < 20) return null;

  const movable = tasks.filter((t) => t.assignee === busiest.initials && t.column === "Backlog");
  if (movable.length === 0) {
    return `${busiest.name} is carrying ${busiest.workloadPct}% workload, ${gap} points above ${freest.name}'s ${freest.workloadPct}% — but has no unstarted Backlog items to hand off. Consider rebalancing on the next sprint plan instead.`;
  }
  const count = Math.min(movable.length, 2);
  return `${busiest.name} is carrying ${busiest.workloadPct}% workload, ${gap} points above ${freest.name}'s ${freest.workloadPct}%. Consider reassigning ${count} Backlog item${count === 1 ? "" : "s"} (e.g. "${movable[0].title}") to ${freest.name}.`;
}

export function AiWorkloadPanel({ people, tasks }: { people: Person[]; tasks: Task[] }) {
  const recommendation = computeRecommendation(people, tasks);
  if (!recommendation) return null;

  return (
    <PulseCard>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} color="#14B8A6" />
        <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
          AI workload recommendation
        </h3>
      </div>
      <Eyebrow color="#2563EB">Computed from current assignments</Eyebrow>
      <p className="text-sm leading-snug mt-2" style={{ color: "#C7D2E3" }}>
        {recommendation}
      </p>
    </PulseCard>
  );
}
