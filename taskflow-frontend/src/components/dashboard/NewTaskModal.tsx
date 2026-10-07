import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Modal } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { COLUMNS, PRIORITIES } from "../../data/mockData";
import { useTeamMembers } from "../../context/TeamContext";
import { suggestLabels } from "../../lib/nlp";
import { api } from "../../lib/api";
import type { Task, TaskColumn, Priority } from "../../types";

/**
 * Fallback description draft, keyed off the title — used when the real
 * AI call fails (backend offline or OPENAI_API_KEY not set), so the
 * button stays useful either way.
 */
function draftDescription(title: string, labels: string[]): string {
  const labelNote = labels.length > 0 ? ` Tagged as ${labels.join(", ")} based on the title.` : "";
  return `${title}. Needs review before starting — confirm scope and acceptance criteria with the assignee.${labelNote}`;
}

export function NewTaskModal({
  open,
  onClose,
  onCreate,
  defaultColumn,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (task: Task) => void;
  defaultColumn?: TaskColumn;
}) {
  const members = useTeamMembers();
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [description, setDescription] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [assignee, setAssignee] = useState(members[0]?.initials ?? "");
  const [due, setDue] = useState("");
  const [column, setColumn] = useState<TaskColumn>(defaultColumn ?? "Backlog");

  const suggestedLabels = title.trim() ? suggestLabels(title) : [];

  // Always start from a clean slate when the dialog opens — closing via
  // Cancel / the overlay (or a failed create) must not leak the previous
  // draft into the next session.
  useEffect(() => {
    if (open) {
      reset();
      setColumn(defaultColumn ?? "Backlog");
    }
  }, [open, defaultColumn]);

  // Team members load asynchronously (seeded from the authenticated user);
  // default the assignee once they're available if nothing's been picked yet.
  useEffect(() => {
    if (!assignee && members.length > 0) setAssignee(members[0].initials);
  }, [members, assignee]);

  function reset() {
    setTitle("");
    setProject("");
    setDescription("");
    setLabels([]);
    setPriority("Medium");
    setAssignee(members[0]?.initials ?? "");
    setDue("");
  }

  async function draftWithAi() {
    if (!title.trim()) return;
    setDrafting(true);
    try {
      // Real AI draft via the backend's OpenAI-backed /ai/ask endpoint.
      const res = await api.post<{ answer?: string }>("/ai/ask", {
        question: `Write a concise 1-2 sentence task description for a work item titled "${title.trim()}". Reply with only the description text.`,
      });
      const answer = res.answer?.trim() ?? "";
      // The AiService returns a {"error": ...} JSON string when AI isn't configured.
      if (!answer || /^\s*\{\s*"error"/.test(answer)) throw new Error("AI unavailable");
      setDescription(answer);
    } catch {
      setDescription(draftDescription(title.trim(), suggestedLabels));
    } finally {
      setDrafting(false);
    }
  }

  function toggleLabel(label: string) {
    setLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      id: `t${Date.now()}`,
      title: title.trim(),
      project: project.trim() || "General",
      priority,
      assignee,
      due: due.trim() || "No due date",
      column,
      description: description.trim() || undefined,
      labels: labels.length ? labels : undefined,
    });
    reset();
    onClose();
  }

  const fieldStyle = {
    background: "var(--tf-fill-04)",
    border: "1px solid var(--tf-panel-border)",
    color: "var(--tf-ink)",
  };
  const labelStyle = { color: "var(--tf-ink-muted)" };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="task-title" className="text-[11px] font-mono block mb-1" style={labelStyle}>
            Title *
          </label>
          <input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
            placeholder="e.g. Fix owner-detection bug"
            className="w-full text-[13px] px-3 py-2 rounded-xl outline-none"
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="task-project" className="text-[11px] font-mono block mb-1" style={labelStyle}>
            Project
          </label>
          <input
            id="task-project"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="e.g. Platform Core"
            className="w-full text-[13px] px-3 py-2 rounded-xl outline-none"
            style={fieldStyle}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="task-description" className="text-[11px] font-mono" style={labelStyle}>
              Description
            </label>
            <button
              type="button"
              onClick={draftWithAi}
              disabled={!title.trim() || drafting}
              className="flex items-center gap-1 text-[11px] disabled:opacity-40"
              style={{ color: "var(--tf-teal)" }}
              title="Drafts a description with the AI assistant — falls back to a quick template if AI is unavailable"
            >
              {drafting ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {drafting ? "Drafting..." : "Draft with AI"}
            </button>
          </div>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What needs to happen here?"
            className="w-full text-[13px] px-3 py-2 rounded-xl outline-none resize-none"
            style={fieldStyle}
          />
          {suggestedLabels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] font-mono" style={labelStyle}>
                Suggested:
              </span>
              {suggestedLabels.map((l) => (
                <button key={l} type="button" onClick={() => toggleLabel(l)}>
                  <Badge color={labels.includes(l) ? "var(--tf-teal)" : "var(--tf-ink-muted)"}>{labels.includes(l) ? `✓ ${l}` : l}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="task-priority" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full text-[13px] px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            >
              {PRIORITIES.map((p) => (
                <option key={p} style={{ background: "var(--tf-surface)" }}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-column" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Column
            </label>
            <select
              id="task-column"
              value={column}
              onChange={(e) => setColumn(e.target.value as TaskColumn)}
              className="w-full text-[13px] px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            >
              {COLUMNS.map((c) => (
                <option key={c} style={{ background: "var(--tf-surface)" }}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="task-assignee" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Assignee
            </label>
            <select
              id="task-assignee"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full text-[13px] px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            >
              {members.map((p) => (
                <option key={p.initials} value={p.initials} style={{ background: "var(--tf-surface)" }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-due" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Due
            </label>
            <input
              id="task-due"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              placeholder="e.g. Jul 10"
              className="w-full text-[13px] px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Create task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
