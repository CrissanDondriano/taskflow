import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Modal } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { COLUMNS, PRIORITY_STYLE } from "../../data/mockData";
import { useTeam } from "../../context/TeamContext";
import { suggestLabels } from "../../lib/nlp";
import type { Task, TaskColumn, Priority } from "../../types";

/**
 * A template-based description draft, keyed off the title. This is
 * deliberately NOT presented as a real LLM call — it's a fast, honest
 * heuristic. The taskflow-api backend already has a real OpenAI-backed
 * endpoint (POST /api/ai/generate-tasks) for this; wire this button to that
 * when a backend is connected, and drop this function.
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
  const { members } = useTeam();
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

  useEffect(() => {
    if (open) setColumn(defaultColumn ?? "Backlog");
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

  function draftWithAi() {
    if (!title.trim()) return;
    setDrafting(true);
    setTimeout(() => {
      setDescription(draftDescription(title.trim(), suggestedLabels));
      setDrafting(false);
    }, 600);
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
    background: "rgba(255,255,255,0.04)",
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
              title="Fills in a starter description based on the title — a quick heuristic, not a real AI call"
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
              {Object.keys(PRIORITY_STYLE).map((p) => (
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
