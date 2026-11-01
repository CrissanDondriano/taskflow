import { useEffect, useState } from "react";
import { Modal, Avatar } from "../ui/Primitives";
import { Button } from "../ui/Button";
import { PRIORITIES } from "../../data/mockData";
import { useTeamMembers } from "../../context/TeamContext";
import { ANCHOR_MONTH, ANCHOR_YEAR, TODAY_DAY } from "../../lib/calendar";
import type { Meeting, Priority } from "../../types";

const MONTH_NAME = new Date(ANCHOR_YEAR, ANCHOR_MONTH).toLocaleDateString("en-US", { month: "long" });

/**
 * Create-meeting dialog behind the calendar's "Add event +" action. Kept
 * separate from MeetingDetailModal so creating and editing don't share a
 * half-empty draft, and so validation lives in one obvious place.
 */
export function NewMeetingModal({
  open,
  onClose,
  onCreate,
  defaultDay = TODAY_DAY,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (meeting: Meeting) => void;
  defaultDay?: number;
}) {
  const members = useTeamMembers();
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(defaultDay);
  const [startHour, setStartHour] = useState(9);
  const [durationHours, setDurationHours] = useState(1);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Reset every time the dialog opens — a cancelled draft shouldn't come back.
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDay(defaultDay);
    setStartHour(9);
    setDurationHours(1);
    setPriority("Medium");
    setAttendees([]);
    setError("");
  }, [open, defaultDay]);

  const fieldStyle = { background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" };
  const labelStyle = { color: "var(--tf-ink-muted)" };

  function toggleAttendee(initials: string) {
    setAttendees((prev) => (prev.includes(initials) ? prev.filter((a) => a !== initials) : [...prev, initials]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Give the event a title.");
      return;
    }
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      setError(`Pick a day between 1 and 31 in ${MONTH_NAME}.`);
      return;
    }
    if (!Number.isFinite(startHour) || startHour < 0 || startHour > 23) {
      setError("Start hour must be between 0 and 23.");
      return;
    }
    if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 8) {
      setError("Duration must be between 1 and 8 hours.");
      return;
    }

    onCreate({
      id: `m${Date.now()}`,
      title: cleanTitle,
      day,
      startHour,
      durationHours,
      priority,
      attendees,
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add event">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="new-meeting-title" className="text-[11px] font-mono block mb-1" style={labelStyle}>
            Title
          </label>
          <input
            id="new-meeting-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sprint planning"
            autoFocus
            aria-invalid={error && !title.trim() ? true : undefined}
            className="w-full text-sm px-3 py-2 rounded-xl outline-none font-medium"
            style={fieldStyle}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="new-meeting-day" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Day ({MONTH_NAME.slice(0, 3)})
            </label>
            <input
              id="new-meeting-day"
              type="number"
              min={1}
              max={31}
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="new-meeting-start" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Start hour
            </label>
            <input
              id="new-meeting-start"
              type="number"
              min={0}
              max={23}
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            />
          </div>
          <div>
            <label htmlFor="new-meeting-duration" className="text-[11px] font-mono block mb-1" style={labelStyle}>
              Duration (h)
            </label>
            <input
              id="new-meeting-duration"
              type="number"
              min={1}
              max={8}
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={fieldStyle}
            />
          </div>
        </div>

        <div>
          <label htmlFor="new-meeting-priority" className="text-[11px] font-mono block mb-1" style={labelStyle}>
            Priority
          </label>
          <select
            id="new-meeting-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="w-full text-sm px-3 py-2 rounded-xl outline-none"
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
          <span className="text-[11px] font-mono block mb-1.5" style={labelStyle}>
            Attendees
          </span>
          {members.length === 0 ? (
            <p className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
              No team members yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((p) => {
                const active = attendees.includes(p.initials);
                return (
                  <button
                    key={p.initials}
                    type="button"
                    onClick={() => toggleAttendee(p.initials)}
                    aria-pressed={active}
                    className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs transition-opacity hover:opacity-100"
                    style={{
                      background: active ? "rgba(37,99,235,0.15)" : "var(--tf-fill-04)",
                      opacity: active ? 1 : 0.6,
                      color: "var(--tf-ink)",
                    }}
                  >
                    <Avatar initials={p.initials} color={p.color} size={20} />
                    {p.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="text-[11.5px]" style={{ color: "var(--tf-danger-text)" }}>
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add event
          </Button>
        </div>
      </form>
    </Modal>
  );
}
