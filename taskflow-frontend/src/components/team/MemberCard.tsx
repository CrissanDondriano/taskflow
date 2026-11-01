import { memo, useState } from "react";
import { Mail, MoreVertical, Pencil, X } from "lucide-react";
import { Avatar, GlassPanel } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { DropdownMenu } from "../ui/DropdownMenu";
import { useMeetingsData } from "../../context/MeetingsContext";
import { isPersonBusyNow, nextFreeHour, formatHour } from "../../lib/calendar";
import { JOB_TITLE_PRESETS, UNTITLED } from "../../lib/jobTitles";
import { ApiError } from "../../lib/api";
import type { Person } from "../../types";

const STATUS_LABEL: Record<Person["status"], string> = {
  online: "Available now",
  away: "Away",
  offline: "Offline",
};

const STATUS_COLOR: Record<Person["status"], string> = {
  online: "var(--tf-success)",
  away: "var(--tf-warning)",
  offline: "var(--tf-ink-muted)",
};

const CUSTOM = "__custom__";

export const MemberCard = memo(function MemberCard({
  person,
  assignedCount,
  completedCount,
  onRemove,
  canManage,
  onSaveTitle,
}: {
  person: Person;
  assignedCount: number;
  completedCount: number;
  onRemove: (person: Person) => void;
  canManage: boolean;
  onSaveTitle: (initials: string, title: string | null) => Promise<void>;
}) {
  const meetings = useMeetingsData();
  const currentMeeting = isPersonBusyNow(person.initials, meetings);
  const freeAt = currentMeeting ? nextFreeHour(person.initials, meetings) : null;

  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(person.jobTitle ?? "");
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor() {
    setChoice(person.jobTitle ?? "");
    setCustom(person.jobTitle && !(JOB_TITLE_PRESETS as readonly string[]).includes(person.jobTitle) ? person.jobTitle : "");
    setError(null);
    setEditing(true);
  }

  async function save() {
    const title = choice === CUSTOM ? custom.trim() : choice;
    if (choice === CUSTOM && !title) {
      setError("Type a custom title, or pick a preset.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSaveTitle(person.initials, title || null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the title.");
    } finally {
      setSaving(false);
    }
  }

  const statusText = currentMeeting
    ? `In "${currentMeeting.title}"${freeAt !== null ? ` until ${formatHour(freeAt)}` : ""}`
    : STATUS_LABEL[person.status];

  return (
    <GlassPanel className="p-4 relative">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <Avatar initials={person.initials} color={person.color} size={40} />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{ background: STATUS_COLOR[person.status], border: "2px solid var(--tf-surface)" }}
              title={person.status}
            />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold truncate" style={{ color: "var(--tf-ink)" }}>
              {person.name}
            </div>
            <div className="text-[12.5px] truncate flex items-center gap-1.5" style={{ color: "var(--tf-ink-muted)" }}>
              <span className="truncate">{person.jobTitle ?? UNTITLED}</span>
              {canManage && !editing && (
                <button
                  onClick={openEditor}
                  aria-label={`Edit ${person.name}'s job title`}
                  className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors hover:bg-white/5"
                  style={{ color: "var(--tf-ink-muted)" }}
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu
          trigger={
            <button aria-label={`Actions for ${person.name}`} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: "var(--tf-ink-muted)" }}>
              <MoreVertical size={15} />
            </button>
          }
          groups={[{ items: [{ label: "Remove from team", icon: <X size={13} />, onSelect: () => onRemove(person), danger: true }] }]}
        />
      </div>

      {editing && (
        <div className="mt-3 rounded-xl p-3 flex flex-col gap-2" style={{ background: "var(--tf-fill-03)", border: "1px solid var(--tf-panel-border)" }}>
          <label htmlFor={`title-${person.initials}`} className="text-[11px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
            Job title
          </label>
          <select
            id={`title-${person.initials}`}
            value={(JOB_TITLE_PRESETS as readonly string[]).includes(choice) ? choice : choice ? CUSTOM : ""}
            onChange={(e) => { setChoice(e.target.value === CUSTOM ? CUSTOM : e.target.value); setError(null); }}
            disabled={saving}
            className="w-full text-[13px] px-2.5 py-2 rounded-lg outline-none"
            style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
          >
            <option value="">No title</option>
            {JOB_TITLE_PRESETS.map((t) => (<option key={t} value={t} style={{ background: "var(--tf-surface)" }}>{t}</option>))}
            <option value={CUSTOM} style={{ background: "var(--tf-surface)" }}>Custom…</option>
          </select>
          {choice === CUSTOM && (
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              disabled={saving}
              maxLength={100}
              placeholder="e.g. DevOps Wizard"
              aria-label="Custom job title"
              className="w-full text-[13px] px-2.5 py-2 rounded-lg outline-none"
              style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
          )}
          {error && <p className="text-[11px]" style={{ color: "var(--tf-danger-text)" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="px-2.5 py-1.5 rounded-lg text-[12px] transition-colors hover:bg-white/5 disabled:opacity-50" style={{ color: "var(--tf-ink-muted)" }}>Cancel</button>
            <button type="button" onClick={() => void save()} disabled={saving} className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50" style={{ background: "var(--tf-primary)", color: "#fff" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-3">
        <Badge color={person.color}>{person.department}</Badge>
        <span className="text-[12.5px]" style={{ color: currentMeeting ? "var(--tf-warning)" : "var(--tf-ink-muted)" }}>
          {statusText}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
        <Mail size={12} /> <span className="truncate">{person.email}</span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
            Tasks
          </div>
          <div className="text-[14px] font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            {completedCount}/{assignedCount} done
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>Workload</span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
            <div className="h-full rounded-full" style={{ width: `${person.workloadPct}%`, background: person.color }} />
          </div>
          <span className="text-[12px] font-mono" style={{ color: "var(--tf-ink)" }}>{person.workloadPct}%</span>
        </div>
      </div>
    </GlassPanel>
  );
});