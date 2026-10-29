import { Sparkles } from "lucide-react";

const MUTED = { color: "var(--tf-ink-muted)" };

type Tone = "risk" | "watch" | "track";

const TONES: Record<Tone, { text: string; bar: string; edge: string; wash: string }> = {
  risk: { text: "var(--tf-danger-text)", bar: "var(--tf-danger)", edge: "rgba(239,68,68,0.45)", wash: "rgba(239,68,68,0.10)" },
  watch: { text: "var(--tf-warning-text)", bar: "var(--tf-warning)", edge: "rgba(245,158,11,0.45)", wash: "rgba(245,158,11,0.10)" },
  track: { text: "var(--tf-success-text)", bar: "var(--tf-success)", edge: "rgba(34,197,94,0.40)", wash: "rgba(34,197,94,0.10)" },
};

// Role labels only — no invented people or companies.
const TASKS: { title: string; meta: string; status: string; progress: number; tone: Tone }[] = [
  { title: "Month-end audit", meta: "Accountant · Due tomorrow", status: "At risk", progress: 72, tone: "risk" },
  { title: "Pricing API", meta: "Developer · Due Tuesday", status: "Watch", progress: 46, tone: "watch" },
  { title: "Homepage mockups", meta: "Designer · Due Friday", status: "On track", progress: 22, tone: "track" },
];

/**
 * Decorative "plan import" preview for the hero: a PDF row, three drafted
 * tasks with risk states, and an AI callout. Pure markup so it stays sharp at
 * any size and inherits the active theme. Hidden from assistive tech — the
 * hero copy already carries the meaning.
 */
export function HeroMockup() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[620px]">
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-panel-border)",
          boxShadow: "0 40px 100px rgba(37,99,235,0.18), 0 30px 80px rgba(0,0,0,0.45)",
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
          {["#EF4444", "#F59E0B", "#22C55E"].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          ))}
          <span
            className="mx-auto max-w-[70%] truncate rounded-md px-4 py-1 text-[11px] sm:px-16"
            style={{ background: "var(--tf-fill-05)", ...MUTED }}
          >
            app.taskflow.ai/import
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {/* Uploaded plan */}
          <div
            className="rounded-xl px-3.5 py-3"
            style={{ background: "rgba(37,99,235,0.08)", border: "1px dashed rgba(96,165,250,0.45)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-[12px] font-semibold"
                style={{ background: "linear-gradient(135deg,#2563EB,#14B8A6)", color: "#fff" }}
              >
                PDF
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">q4-launch-plan.pdf</p>
                <p className="text-[11px]" style={MUTED}>3 sections, 2,140 words</p>
              </div>
              <span className="hidden shrink-0 text-[11px] sm:block" style={MUTED}>AI drafted 3 tasks</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--tf-fill-08)" }}>
              <div className="h-full w-[46%] rounded-full" style={{ background: "linear-gradient(90deg,#2563EB,#60A5FA)" }} />
            </div>
          </div>

          {/* Drafted tasks */}
          <div className="mt-3 flex flex-col gap-2.5">
            {TASKS.map((t) => {
              const tone = TONES[t.tone];
              return (
                <div
                  key={t.title}
                  className="rounded-xl px-3.5 py-3"
                  style={{ background: tone.wash, border: `1px solid ${tone.edge}` }}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[13px] font-semibold sm:text-[14px]">{t.title}</p>
                    <p className="shrink-0 text-[10px] sm:text-[11px]" style={MUTED}>{t.meta}</p>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--tf-fill-08)" }}>
                      <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: tone.bar }} />
                    </div>
                    <span className="w-14 shrink-0 text-right text-[10px] font-semibold sm:text-[11px]" style={{ color: tone.text }}>
                      {t.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Send to board */}
          <div className="mt-4 flex justify-end">
            <span
              className="inline-flex min-h-9 items-center justify-center rounded-lg px-4 text-[12px] font-medium"
              style={{ background: "var(--tf-primary)", color: "#fff" }}
            >
              Send to board
            </span>
          </div>
        </div>
      </div>

      {/* Floating AI callout */}
      <div
        className="float mt-3 rounded-xl px-4 py-3 sm:absolute sm:-bottom-7 sm:-left-6 sm:mt-0 sm:max-w-[250px]"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid rgba(37,99,235,0.35)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--tf-accent-text)" }}>
          <Sparkles size={12} /> AI assistant
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: "var(--tf-ink-soft)" }}>
          Start with <b style={{ color: "var(--tf-ink)" }}>Month-end audit</b>. It&apos;s due tomorrow and blocks two tasks.
        </p>
      </div>
    </div>
  );
}
