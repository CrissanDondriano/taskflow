import { useState } from "react";
import { Sparkles, Send, X, MessageSquare } from "lucide-react";
import { useTasksData } from "../../context/TasksContext";
import { useMeetingsData } from "../../context/MeetingsContext";
import { answerQuestion } from "../../lib/aiAssistant";
import { api } from "../../lib/api";

interface ThreadMessage {
  role: "ai" | "user";
  text: string;
}

/** Detects the AiService "not configured" JSON that comes back as the answer string. */
function isAiUnavailable(answer: string): boolean {
  return !answer.trim() || /^\s*\{\s*"error"/.test(answer);
}

/**
 * The AI task assistant, promoted from a card embedded only on the
 * dashboard home page to a floating widget available from anywhere in the
 * app — matches how Intercom/Linear-style assistants work. Lives in
 * DashboardLayout so it persists (including its conversation) across page
 * navigation within the dashboard.
 */
export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && <FloatingAssistantPanel onClose={() => setOpen(false)} />}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI task assistant" : "Open AI task assistant"}
        className="fixed bottom-5 right-4 sm:right-6 z-[900] w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105"
        style={{ background: "linear-gradient(135deg, #2563EB, #14B8A6)", boxShadow: "0 8px 24px rgba(20,184,166,0.4)" }}
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>
    </>
  );
}

/**
 * The chat panel — only mounted while open, so it doesn't subscribe to
 * task/meeting data (and re-render on every change) while closed.
 */
function FloatingAssistantPanel({ onClose }: { onClose: () => void }) {
  const tasks = useTasksData();
  const meetings = useMeetingsData();
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [thread, setThread] = useState<ThreadMessage[]>([
    { role: "ai", text: "I'm watching your projects. Ask me what to prioritize today, or which tasks are at risk." },
  ]);

  async function ask(q: string) {
    if (!q.trim() || thinking) return;
    const text = q.trim();
    setThread((t) => [...t, { role: "user", text }]);
    setQuestion("");
    setThinking(true);

    let answer: string;
    try {
      // Real backend answer (OpenAI-backed /ai/ask with the user's task context).
      const res = await api.post<{ answer?: string }>("/ai/ask", { question: text });
      const ai = res.answer?.trim() ?? "";
      if (isAiUnavailable(ai)) throw new Error("AI unavailable");
      answer = ai;
    } catch {
      // AI not configured or the API is unreachable — fall back to the
      // local keyword heuristics so the assistant still answers.
      answer = answerQuestion(text, tasks, meetings);
    }

    setThinking(false);
    setThread((t) => [...t, { role: "ai", text: answer }]);
  }

  return (
    <div
      role="dialog"
      aria-label="AI task assistant"
      className="fixed bottom-24 right-4 sm:right-6 z-[900] w-[calc(100vw-2rem)] sm:w-96 rounded-2xl overflow-hidden flex flex-col"
      style={{
        maxHeight: "70vh",
        background: "var(--tf-surface)",
        border: "1px solid rgba(20,184,166,0.35)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={15} color="#14B8A6" />
          <span className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            AI task assistant
          </span>
        </div>
        <button onClick={onClose} aria-label="Close assistant" className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "var(--tf-ink-muted)" }}>
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto tf-scroll px-4 py-3 flex flex-col gap-2">
        {thread.map((m, i) => (
          <div
            key={i}
            className={`text-sm px-3 py-2 rounded-xl max-w-[85%] ${m.role === "user" ? "self-end ml-auto text-white" : "self-start"}`}
            style={m.role === "ai" ? { background: "var(--tf-fill-05)", color: "var(--tf-ink-soft)" } : { background: "var(--tf-primary)" }}
          >
            {m.text}
          </div>
        ))}
        {thinking && (
          <div
            className="text-sm px-3 py-2 rounded-xl self-start animate-pulse"
            style={{ background: "var(--tf-fill-05)", color: "var(--tf-ink-muted)" }}
            aria-live="polite"
          >
            Thinking…
          </div>
        )}
      </div>

      <div className="flex gap-2 p-3 shrink-0" style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(question)}
          disabled={thinking}
          placeholder="What should I work on today?"
          aria-label="Ask the AI task assistant"
          autoFocus
          className="flex-1 text-sm px-3 py-2 rounded-xl outline-none disabled:opacity-60"
          style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
        />
        <button
          onClick={() => ask(question)}
          disabled={thinking}
          aria-label="Send"
          className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0 disabled:opacity-50"
          style={{ background: "var(--tf-primary)", boxShadow: "0 0 16px rgba(37,99,235,0.35)" }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
