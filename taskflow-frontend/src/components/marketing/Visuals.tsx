import { Bell, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";

const PANEL = { background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" };
const MUTED = { color: "var(--tf-ink-muted)" };

/** Decorative product mockups built in code (no image files, no layout shift). */

export function DashboardMock() {
  const cols = [
    { name: "Backlog", cards: [["Plan Q4 roadmap", "#2DD4BF"], ["Update API docs", "#2DD4BF"]] },
    { name: "In progress", cards: [["Ship billing webhook", "#F87171"], ["Review onboarding copy", "#FBBF24"]] },
    { name: "Done", cards: [["Set up CI pipeline", "#2DD4BF"], ["Design settings page", "#2DD4BF"]] },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto max-w-5xl">
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)", boxShadow: "0 40px 100px rgba(37,99,235,0.18), 0 30px 80px rgba(0,0,0,0.55)" }}>
        <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
          {["#EF4444", "#F59E0B", "#22C55E"].map((c) => <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
          <span className="mx-auto rounded-md px-16 py-1 text-[11px]" style={{ background: "var(--tf-fill-05)", ...MUTED }}>app.taskflow.ai/dashboard</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr]">
          <div className="hidden flex-col gap-1.5 p-4 sm:flex" style={{ borderRight: "1px solid var(--tf-panel-border)" }}>
            {["Mission control", "Kanban board", "Calendar", "Meeting notes", "Team", "Reports"].map((l, i) => (
              <div key={l} className="rounded-lg px-3 py-2 text-[12px]" style={{ background: i === 0 ? "var(--tf-mock-chip)" : "transparent", color: i === 0 ? "#fff" : "var(--tf-ink-muted)" }}>{l}</div>
            ))}
          </div>
          <div className="flex flex-col gap-4 p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-3">
              {[["Open tasks", "24"], ["At risk", "3"], ["Done this week", "17"]].map(([k, v], i) => (
                <div key={k} className="rounded-xl p-3" style={PANEL}>
                  <p className="text-[11px]" style={MUTED}>{k}</p>
                  <p className="font-display text-[22px] font-semibold" style={{ color: i === 1 ? "#F87171" : "var(--tf-ink)" }}>{v}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cols.map((c, ci) => (
                <div key={c.name} className={`rounded-xl p-3 ${ci === 2 ? "hidden sm:block" : ""}`} style={{ background: "var(--tf-fill-02)", border: "1px solid var(--tf-panel-border)" }}>
                  <p className="mb-2 text-[11px] font-semibold" style={MUTED}>{c.name}</p>
                  {c.cards.map(([t, tone]) => (
                    <div key={t} className="mb-2 rounded-lg p-2.5 text-[12px]" style={PANEL}>
                      {t}
                      <span className="mt-2 block h-1 w-10 rounded-full" style={{ background: tone }} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="float absolute -left-3 top-24 hidden items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium lg:flex" style={{ ...PANEL, boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
        <ShieldAlert size={15} color="#F87171" /> Billing webhook is at risk
      </div>
      <div className="float absolute -right-3 bottom-16 hidden items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium lg:flex" style={{ ...PANEL, animationDelay: "1.5s", boxShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>
        <CheckCircle2 size={15} color="#2DD4BF" /> 4 tasks created from meeting notes
      </div>
    </div>
  );
}

export function ChatVisual() {
  return (
    <div aria-hidden="true" className="rounded-2xl p-5" style={PANEL}>
      <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold"><Sparkles size={14} color="#2DD4BF" /> AI assistant</div>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px]" style={{ background: "var(--tf-primary)", color: "#fff" }}>What should I work on today?</p>
      <div className="mt-3 max-w-[92%] rounded-2xl rounded-bl-sm px-3.5 py-3 text-[13px] leading-relaxed" style={{ background: "var(--tf-fill-05)" }}>
        Start with <b>Ship billing webhook</b>. It's due tomorrow and blocks two tasks. Then review the onboarding copy before Friday.
      </div>
      <div className="mt-3 flex gap-2 text-[11px]" style={MUTED}>
        {["Summarize project", "Which tasks are late?"].map((s) => <span key={s} className="rounded-full px-2.5 py-1" style={{ border: "1px solid var(--tf-panel-border)" }}>{s}</span>)}
      </div>
    </div>
  );
}

export function RiskVisual() {
  const rows = [["Payments", 82, "#F87171"], ["Growth", 55, "#FBBF24"], ["Platform", 24, "#2DD4BF"], ["Product", 18, "#2DD4BF"]] as const;
  return (
    <div aria-hidden="true" className="rounded-2xl p-5" style={PANEL}>
      <div className="mb-4 flex items-center gap-2 text-[12px] font-semibold"><Bell size={14} color="#FBBF24" /> Project risk score</div>
      <div className="flex flex-col gap-3.5">
        {rows.map(([n, v, c]) => (
          <div key={n}>
            <div className="mb-1 flex justify-between text-[12px]"><span>{n}</span><span style={MUTED}>{v}%</span></div>
            <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--tf-fill-06)" }}>
              <div className="h-full rounded-full" style={{ width: `${v}%`, background: c }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarsVisual() {
  const h = [38, 52, 44, 68, 60, 82, 74];
  return (
    <div aria-hidden="true" className="rounded-2xl p-5" style={PANEL}>
      <div className="mb-4 text-[12px] font-semibold">Tasks completed per day</div>
      <div className="flex h-40 items-end gap-3">
        {h.map((v, i) => <div key={i} className="bar flex-1 rounded-t-md" style={{ height: `${v}%`, background: "linear-gradient(to top, #2563EB, #14B8A6)", transitionDelay: `${0.25 + i * 0.07}s` }} />)}
      </div>
      <div className="mt-2 flex justify-between text-[11px]" style={MUTED}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}</div>
    </div>
  );
}