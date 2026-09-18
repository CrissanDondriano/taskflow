import { CalendarDays, Clock3, LayoutGrid, ListTree } from "lucide-react";

export type CalendarViewMode = "day" | "week" | "month" | "agenda";

const TABS: { mode: CalendarViewMode; label: string; icon: React.ReactNode; key: string }[] = [
  { mode: "day", label: "Day", icon: <Clock3 size={13} />, key: "1" },
  { mode: "week", label: "Week", icon: <CalendarDays size={13} />, key: "2" },
  { mode: "month", label: "Month", icon: <LayoutGrid size={13} />, key: "3" },
  { mode: "agenda", label: "Agenda", icon: <ListTree size={13} />, key: "4" },
];

export function CalendarViewTabs({ view, onChange }: { view: CalendarViewMode; onChange: (v: CalendarViewMode) => void }) {
  return (
    <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "rgba(255,255,255,0.03)" }}>
      {TABS.map((t) => (
        <button
          key={t.mode}
          onClick={() => onChange(t.mode)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: view === t.mode ? "var(--tf-primary)" : "transparent", color: view === t.mode ? "white" : "var(--tf-ink-muted)" }}
          title={`Shortcut: ${t.key}`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}
