import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal, Avatar } from "../ui/Primitives";
import { Button } from "../ui/Button";
import { PRIORITY_HEX } from "../../data/mockData";
import { useTeam } from "../../context/TeamContext";
import type { Meeting, Priority } from "../../types";

export function MeetingDetailModal({
  meeting,
  onClose,
  onSave,
  onDelete,
}: {
  meeting: Meeting | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Meeting>) => void;
  onDelete: (id: string) => void;
}) {
  const { members } = useTeam();
  const [draft, setDraft] = useState<Meeting | null>(meeting);
  const [lastId, setLastId] = useState<string | null>(meeting?.id ?? null);

  // Only sync in a new meeting; keep the previous one rendered while Modal's
  // close animation plays instead of unmounting instantly when meeting -> null.
  useEffect(() => {
    if (meeting) {
      setDraft(meeting);
      setLastId(meeting.id);
    }
  }, [meeting]);

  const fieldStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" };
  const labelStyle = { color: "var(--tf-ink-muted)" };

  function toggleAttendee(initials: string) {
    setDraft((d) => {
      if (!d) return d;
      const has = d.attendees.includes(initials);
      return { ...d, attendees: has ? d.attendees.filter((a) => a !== initials) : [...d.attendees, initials] };
    });
  }

  function save() {
    if (!draft) return;
    onSave(lastId ?? draft.id, draft);
    onClose();
  }

  return (
    <Modal open={!!meeting} onClose={onClose} title="Meeting details">
      {draft && (
      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="meeting-title" className="text-[11px] font-mono block mb-1" style={labelStyle}>
            Title
          </label>
          <input
            id="meeting-title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full text-sm px-3 py-2 rounded-xl outline-none font-medium"
            style={fieldStyle}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="meeting-day" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Day (July)
            </label>
            <input
              id="meeting-day"
              type="number"
              min={1}
              max={31}
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="meeting-start" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Start hour
            </label>
            <input
              id="meeting-start"
              type="number"
              min={0}
              max={23}
              value={draft.startHour}
              onChange={(e) => setDraft({ ...draft, startHour: Number(e.target.value) })}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="meeting-duration" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Duration (h)
            </label>
            <input
              id="meeting-duration"
              type="number"
              min={1}
              max={8}
              value={draft.durationHours}
              onChange={(e) => setDraft({ ...draft, durationHours: Number(e.target.value) })}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            />
          </div>
        </div>

        <div>
          <label htmlFor="meeting-priority" className="text-[11px] font-mono block mb-1" style={labelStyle}>
            Priority
          </label>
          <select
            id="meeting-priority"
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
          <label className="text-[11px] font-mono block mb-1.5" style={labelStyle}>
            Attendees
          </label>
          <div className="flex flex-wrap gap-2">
            {members.map((p) => {
              const active = draft.attendees.includes(p.initials);
              return (
                <button
                  key={p.initials}
                  onClick={() => toggleAttendee(p.initials)}
                  className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs transition-opacity"
                  style={{ background: active ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.04)", opacity: active ? 1 : 0.5, color: "var(--tf-ink)" }}
                >
                  <Avatar initials={p.initials} color={p.color} size={20} />
                  {p.name.split(" ")[0]}
                </button>
              );
            })}
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
