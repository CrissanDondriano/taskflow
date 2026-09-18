import { useState } from "react";
import { Sparkles, Send, X, MessageSquare } from "lucide-react";
import { useTasks } from "../../context/TasksContext";
import { useMeetings } from "../../context/MeetingsContext";
import { answerQuestion } from "../../lib/aiAssistant";

interface ThreadMessage {
  role: "ai" | "user";
  text: string;
}

/**
 * The AI task assistant, promoted from a card embedded only on the
 * dashboard home page to a floating widget available from anywhere in the
 * app — matches how Intercom/Linear-style assistants work. Lives in
 * DashboardLayout so it persists (including its conversation) across page
 * navigation within the dashboard.
 */
export function FloatingAssistant() {
  const { tasks } = useTasks();
  const { meetings } = useMeetings();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<ThreadMessage[]>([
    { role: "ai", text: "I'm watching your projects. Ask me what to prioritize today, or which tasks are at risk." },
  ]);

  function ask(q: string) {
    if (!q.trim()) return;
    const answer = answerQuestion(q, tasks, meetings);
    setThread((t) => [...t, { role: "user", text: q }, { role: "ai", text: answer }]);
    setQuestion("");
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="AI task assistant"
          className="fixed bottom-24 right-4 sm:right-6 z-[900] w-[calc(100vw-2rem)] sm:w-96 rounded-2xl overflow-hidden flex flex-col"
          style={{
            maxHeight: "70vh",
            background: "var(--tf-surface)",
            border: "1px solid rgba(20,184,166,0.35)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5), 0 0 24px rgba(20,184,166,0.12)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
            <div className="flex items-center gap-2">
              <Sparkles size={15} color="#14B8A6" />
              <span className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                AI task assistant
              </span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ color: "var(--tf-ink-muted)" }}>
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto tf-scroll px-4 py-3 flex flex-col gap-2">
            {thread.map((m, i) => (
              <div
                key={i}
                className={`text-sm px-3 py-2 rounded-xl max-w-[85%] ${m.role === "user" ? "self-end ml-auto text-white" : "self-start"}`}
                style={m.role === "ai" ? { background: "rgba(255,255,255,0.05)", color: "#C7D2E3" } : { background: "var(--tf-primary)" }}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex gap-2 p-3 shrink-0" style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(question)}
              placeholder="What should I work on today?"
              aria-label="Ask the AI task assistant"
              autoFocus
              className="flex-1 text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
            <button
              onClick={() => ask(question)}
              aria-label="Send"
              className="w-9 h-9 rounded-xl text-white flex items-center justify-center shrink-0"
              style={{ background: "var(--tf-primary)", boxShadow: "0 0 16px rgba(37,99,235,0.35)" }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

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
