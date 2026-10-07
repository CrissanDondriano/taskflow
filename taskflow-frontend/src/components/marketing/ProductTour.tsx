import { useRef, useState, type KeyboardEvent } from "react";
import { DashboardMock, ChatVisual, RiskVisual, BarsVisual } from "./Visuals";

const TABS = [
  { id: "mission", label: "Mission Control", title: "Everything that needs you, on one screen", desc: "Tasks, calendar, team workload and AI insights together, so you never piece status together from five tabs.", visual: <DashboardMock /> },
  { id: "assistant", label: "AI assistant", title: "Ask a question, get an answer from your real data", desc: "Ask what to work on today or which tasks are slipping. The assistant reads your live tasks, deadlines and assignees.", visual: <ChatVisual /> },
  { id: "risk", label: "Risk detection", title: "See what's trending late before it is", desc: "Every task and project is scored for deadline and workload risk, so the work that needs attention rises to the top.", visual: <RiskVisual /> },
  { id: "analytics", label: "Analytics", title: "Reports that are already written", desc: "Completion trends, workload balance and project health update as work happens.", visual: <BarsVisual /> },
];

/** Accessible tabbed product tour (arrow keys, Home and End work). */
export function ProductTour() {
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (n: number) => { const k = (n + TABS.length) % TABS.length; setI(k); refs.current[k]?.focus(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(TABS.length - 1);
    else return;
    e.preventDefault();
  };
  const t = TABS[i];

  return (
    <div>
      <div role="tablist" aria-label="Product tour" onKeyDown={onKey} className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((tab, k) => (
          <button
            key={tab.id} ref={(el) => { refs.current[k] = el; }} type="button" role="tab" id={`tab-${tab.id}`}
            aria-selected={k === i} aria-controls="tour-panel" tabIndex={k === i ? 0 : -1} onClick={() => setI(k)}
            className="min-h-11 shrink-0 rounded-full px-5 text-[14px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tf-teal)] motion-reduce:transition-none"
            style={k === i ? { background: "var(--tf-primary)", color: "#fff" } : { border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="tour-panel" aria-labelledby={`tab-${t.id}`} key={t.id} className="rise grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <h3 className="font-display text-[22px] font-semibold leading-tight text-balance sm:text-[26px]">{t.title}</h3>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{t.desc}</p>
        </div>
        <div className="min-w-0 lg:col-span-8">{t.visual}</div>
      </div>
    </div>
  );
}