export type CalendarViewMode = "day" | "week" | "month" | "agenda";

const TABS: { mode: CalendarViewMode; label: string; key: string }[] = [
  { mode: "day", label: "Day", key: "1" },
  { mode: "week", label: "Week", key: "2" },
  { mode: "month", label: "Month", key: "3" },
  { mode: "agenda", label: "Agenda", key: "4" },
];

export function CalendarViewTabs({ view, onChange }: { view: CalendarViewMode; onChange: (v: CalendarViewMode) => void }) {
  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl shrink-0"
      style={{ background: "var(--tf-fill-03)", border: "1px solid var(--tf-panel-border)" }}
      role="group"
      aria-label="Calendar view"
    >
      {TABS.map((t) => {
        const active = view === t.mode;
        return (
          <button
            key={t.mode}
            onClick={() => onChange(t.mode)}
            aria-pressed={active}
            title={`Shortcut: ${t.key}`}
            className="h-8 px-3 rounded-lg text-[12px] transition-colors"
            style={{
              background: active ? "var(--tf-fill-12)" : "transparent",
              color: active ? "var(--tf-ink)" : "var(--tf-ink-muted)",
              fontWeight: active ? 600 : 500,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
