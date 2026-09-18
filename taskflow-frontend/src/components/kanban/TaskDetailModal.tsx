import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal, Avatar } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { COLUMNS, PRIORITY_HEX } from "../../data/mockData";
import { useTeam } from "../../context/TeamContext";
import type { Task, TaskColumn, Priority } from "../../types";

export function TaskDetailModal({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
}) {
  const { members } = useTeam();
  const [draft, setDraft] = useState<Task | null>(task);
  const [lastId, setLastId] = useState<string | null>(task?.id ?? null);

  // Only sync in a new task; keep the previous one rendered while Modal's
  // close animation plays instead of unmounting instantly when task -> null.
  useEffect(() => {
    if (task) {
      setDraft(task);
      setLastId(task.id);
    }
  }, [task]);

  function save() {
    if (!draft) return;
    onSave(lastId ?? draft.id, draft);
    onClose();
  }

  const fieldStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" };
  const labelStyle = { color: "var(--tf-ink-muted)" };

  return (
    <Modal open={!!task} onClose={onClose} title="Task details">
      {draft && (
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="detail-title" className="text-[11px] font-mono block mb-1" style={labelStyle}>
            Title
          </label>
          <input
            id="detail-title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full text-sm px-3 py-2 rounded-xl outline-none font-medium"
            style={fieldStyle}
          />
        </div>

        <div>
          <label htmlFor="detail-desc" className="text-[11px] font-mono block mb-1" style={labelStyle}>
            Description
          </label>
          <textarea
            id="detail-desc"
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={3}
            placeholder="Add more context for anyone picking this up..."
            className="w-full text-sm px-3 py-2 rounded-xl outline-none resize-none"
            style={fieldStyle}
          />
        </div>

        {draft.labels && draft.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draft.labels.map((l) => (
              <Badge key={l} color="var(--tf-ink-muted)">
                {l}
              </Badge>
            ))}
          </div>
        )}

        {draft.checklist && (
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1" style={labelStyle}>
              <span>Checklist</span>
              <span>
                {draft.checklist.done}/{draft.checklist.total}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${(draft.checklist.done / draft.checklist.total) * 100}%`, background: "var(--tf-teal)" }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="detail-priority" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Priority
            </label>
            <select
              id="detail-priority"
              value={draft.priority}
              onChange={(e) => setDraft({ ...draft, priority: e.target.value as Priority })}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            >
              {Object.keys(PRIORITY_HEX).map((p) => (
                <option key={p} style={{ background: "var(--tf-surface)" }}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="detail-column" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Column
            </label>
            <select
              id="detail-column"
              value={draft.column}
              onChange={(e) => setDraft({ ...draft, column: e.target.value as TaskColumn })}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
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
            <label htmlFor="detail-assignee" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Assignee
            </label>
            <div className="flex items-center gap-2">
              <select
                id="detail-assignee"
                value={draft.assignee}
                onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={fieldStyle}
              >
                {members.map((p) => (
                  <option key={p.initials} value={p.initials} style={{ background: "var(--tf-surface)" }}>
                    {p.name}
                  </option>
                ))}
              </select>
              {(() => {
                const person = members.find((p) => p.initials === draft.assignee);
                return person ? <Avatar initials={person.initials} color={person.color} size={30} /> : null;
              })()}
            </div>
          </div>
          <div>
            <label htmlFor="detail-due" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Due
            </label>
            <input
              id="detail-due"
              value={draft.due}
              onChange={(e) => setDraft({ ...draft, due: e.target.value })}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            />
          </div>
        </div>

        <div className="flex justify-between items-center gap-2 mt-2">
          <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => { if (lastId) onDelete(lastId); onClose(); }}>
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save changes
            </Button>
          </div>
        </div>
      </div>
      )}
    </Modal>
  );
}
