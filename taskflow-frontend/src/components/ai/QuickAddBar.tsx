import { useState } from "react";
import { Sparkles, Plus } from "lucide-react";
import { PriorityBadge } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { parseQuickAdd, formatDueDay } from "../../lib/nlp";
import { initialsOf } from "../../lib/format";
import { useAuthStore } from "../../stores/authStore";
import type { Task, TaskColumn } from "../../types";

/**
 * "Natural language task creation" from the brief. Type free text like
 * "fix login bug tomorrow critical" and it's parsed live (see lib/nlp.ts)
 * into title/priority/due/labels, shown as a preview before you commit.
 * This is a real deterministic parser, not an LLM call — see the comment
 * in lib/nlp.ts for why that's the honest way to describe it.
 */
export function QuickAddBar({ onCreate, defaultColumn = "Backlog" }: { onCreate: (task: Task) => void; defaultColumn?: TaskColumn }) {
  const [text, setText] = useState("");
  const user = useAuthStore((s) => s.user);
  const parsed = text.trim() ? parseQuickAdd(text) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed || !parsed.title) return;
    onCreate({
      id: `t${Date.now()}`,
      title: parsed.title,
      project: "General",
      priority: parsed.priority,
      // Assign to whoever is actually signed in (never a hardcoded person),
      // so workload/reports count the task instead of orphaning it.
      assignee: user ? initialsOf(user.name) : "",
      due: formatDueDay(parsed.dueDay),
      column: defaultColumn,
      labels: parsed.labels.length ? parsed.labels : undefined,
    });
    setText("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div
        className="flex items-center gap-3 rounded-xl px-3 py-1.5 transition-colors"
        style={{ background: "var(--tf-fill-03)", border: "1px solid var(--tf-panel-border)" }}
      >
        <Sparkles size={15} className="shrink-0" style={{ color: "var(--tf-teal)" }} aria-hidden="true" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Try: "Fix login bug tomorrow, critical"'
          aria-label="Quick add task with natural language"
          className="flex-1 min-w-0 bg-transparent text-[13px] py-2 outline-none"
          style={{ color: "var(--tf-ink)" }}
        />
        <button
          type="submit"
          disabled={!parsed?.title}
          className="shrink-0 h-8 px-3.5 rounded-lg text-[12.5px] font-semibold flex items-center gap-1 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--tf-primary)", color: "#fff" }}
        >
          <Plus size={13} aria-hidden="true" /> Add
        </button>
      </div>

      {parsed && parsed.title && (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          <span className="text-[10px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
            AI parsed:
          </span>
          <PriorityBadge priority={parsed.priority} />
          {parsed.dueDay !== null && <Badge color="var(--tf-ink-muted)">{formatDueDay(parsed.dueDay)}</Badge>}
          {parsed.labels.map((l) => (
            <Badge key={l} color="var(--tf-teal)">
              {l}
            </Badge>
          ))}
        </div>
      )}
    </form>
  );
}
