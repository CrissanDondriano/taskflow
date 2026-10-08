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
      <div className="relative">
        <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-teal)" }} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Try: "Fix login bug tomorrow, critical"'
          aria-label="Quick add task with natural language"
          className="w-full text-sm pl-9 pr-20 py-2.5 rounded-xl outline-none"
          style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
        />
        <button
          type="submit"
          disabled={!parsed?.title}
          className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg text-white text-xs font-medium flex items-center gap-1 disabled:opacity-40 transition-opacity hover:opacity-90"
          style={{ background: "var(--tf-primary)" }}
        >
          <Plus size={12} /> Add
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
