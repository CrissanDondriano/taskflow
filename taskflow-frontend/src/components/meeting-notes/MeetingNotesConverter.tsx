import { useState } from "react";
import { Sparkles, Upload, FileText, Check, ArrowRight, ListChecks, RotateCcw, CheckSquare, Square, Calendar } from "lucide-react";
import { GlassPanel, PulseCard, Avatar } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { PriorityLegend } from "../ui/PriorityLegend";
import { DropdownMenu } from "../ui/DropdownMenu";
import { PRIORITY_STYLE, PRIORITIES, COLUMNS } from "../../data/mockData";
import { useTeamMembers } from "../../context/TeamContext";
import { suggestLabels } from "../../lib/nlp";
import { api } from "../../lib/api";
import { useTaskActions } from "../../context/TasksContext";
import { formatDueDate } from "../../lib/taskAdapter";
import { extractLocally, detectSpeakers, countWords } from "../../lib/meetingNotes";
import type { ActionItem, Priority, Task, TaskColumn } from "../../types";

interface ExtractResult {
  summary: string;
  actionItems: ActionItem[];
  project: string;
  method: "ai" | "local";
}

interface AiActionItem {
  title?: string;
  suggested_owner?: string;
  priority?: string;
}

function capitalizePriority(value?: string): Priority {
  const v = (value ?? "").toLowerCase();
  if (v === "critical" || v === "high" || v === "medium" || v === "low") {
    return (v.charAt(0).toUpperCase() + v.slice(1)) as Priority;
  }
  return "Medium";
}

function toIsoDate(value: string): string | null {
  if (!value) return null;
  return value; // already yyyy-mm-dd from <input type="date">
}

/** Compact due-date control: a button that swaps to a native date picker. */
function DueDateControl({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        value={value ?? ""}
        onChange={(e) => onChange(toIsoDate(e.target.value))}
        onBlur={() => setEditing(false)}
        aria-label="Due date"
        className="text-[11px] rounded-lg px-2 py-1 outline-none"
        style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-[11px] rounded-lg px-2 py-1 transition-colors hover:bg-white/5"
      style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
      aria-label={value ? "Change due date" : "Set due date"}
    >
      <Calendar size={11} aria-hidden="true" />
      {value ? formatDueDate(value) : "Set due"}
    </button>
  );
}

async function aiExtract(memberNames: string[], notes: string): Promise<ExtractResult> {
  const res = await api.post<{ error?: string; summary?: string; action_items?: AiActionItem[] }>("/ai/meeting-notes", { notes });

  if (res.error || !Array.isArray(res.action_items)) {
    throw new Error(res.error ?? "AI extraction unavailable.");
  }

  const owner = (i: number) => memberNames[i % Math.max(memberNames.length, 1)] ?? "Unassigned";
  const actionItems: ActionItem[] = res.action_items.map((item, i) => {
    const suggested = item.suggested_owner?.trim();
    const matched = suggested ? memberNames.find((n) => n.toLowerCase() === suggested.toLowerCase()) : undefined;
    return {
      id: `ai${i + 1}`,
      title: item.title?.trim() || "Untitled action item",
      owner: matched ?? owner(i),
      priority: capitalizePriority(item.priority),
      selected: true,
      dueDate: null,
    };
  });

  return {
    project: "Platform Core",
    summary: res.summary?.trim() || "Notes summarized — review the action items below.",
    actionItems,
    method: "ai",
  };
}

function localExtract(notes: string, memberNames: string[]): ExtractResult {
  const { summary, actionItems } = extractLocally(notes, memberNames);
  return {
    project: "Platform Core",
    summary: summary || "Notes summarized — review the action items below.",
    actionItems: actionItems.map((item, i) => ({
      id: `local${i + 1}`,
      title: item.title,
      owner: item.owner,
      priority: item.priority,
      selected: true,
      dueDate: item.dueDate,
    })),
    method: "local",
  };
}

export function MeetingNotesConverter() {
  const { addTask } = useTaskActions();
  const members = useTeamMembers();
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "unavailable">("idle");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const [sendTo, setSendTo] = useState<TaskColumn>("Backlog");

  function reset() {
    setStatus("idle");
    setResult(null);
    setCreatedCount(null);
  }

  function startOver() {
    setNotes("");
    setFileName(null);
    reset();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setNotes(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function convert() {
    if (!notes.trim()) return;
    setStatus("processing");
    setCreatedCount(null);
    const memberNames = members.map((m) => m.name);
    try {
      setResult(await aiExtract(memberNames, notes.trim()));
      setStatus("done");
    } catch {
      // AI unavailable: try a local, honest extraction before giving up.
      const local = localExtract(notes.trim(), memberNames);
      if (local.actionItems.length > 0) {
        setResult(local);
        setStatus("done");
      } else {
        setStatus("unavailable");
      }
    }
  }

  function toggleItem(id: string) {
    setResult((r) => (r ? { ...r, actionItems: r.actionItems.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)) } : r));
  }
  function updateItem(id: string, field: "title" | "owner" | "priority" | "dueDate", value: string) {
    setResult((r) =>
      r ? { ...r, actionItems: r.actionItems.map((i) => (i.id === id ? { ...i, [field]: value } : i)) } : r
    );
  }
  function toggleAll(selectAll: boolean) {
    setResult((r) => (r ? { ...r, actionItems: r.actionItems.map((i) => ({ ...i, selected: selectAll })) } : r));
  }

  function createTasks() {
    if (!result) return;
    const selected = result.actionItems.filter((i) => i.selected);
    selected.forEach((item, idx) => {
      const person = members.find((p) => p.name === item.owner);
      const task: Task = {
        id: `t${Date.now()}-${idx}`,
        title: item.title,
        project: result.project,
        priority: item.priority,
        assignee: person?.initials ?? members[0]?.initials ?? "",
        due: item.dueDate ? formatDueDate(item.dueDate) : "No due date",
        column: sendTo,
        labels: suggestLabels(item.title),
      };
      addTask(task);
    });
    setCreatedCount(selected.length);
  }

  const selectedCount = result?.actionItems.filter((i) => i.selected).length ?? 0;
  const allSelected = result ? result.actionItems.every((i) => i.selected) : false;
  const fieldStyle = { background: "var(--tf-fill-03)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" };
  const words = countWords(notes);
  const speakers = detectSpeakers(notes);

  // Stepper progress: 1 = add notes, 2 = review results, 3 = created.
  const step = createdCount !== null ? 3 : result ? 2 : 1;

  function stepCircle(n: number) {
    const done = step > n;
    const current = step === n;
    if (done) {
      return (
        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--tf-teal)", color: "#fff" }}>
          <Check size={13} />
        </span>
      );
    }
    if (current) {
      return (
        <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[13px] font-semibold" style={{ background: "var(--tf-primary)", color: "#fff" }}>
          {n}
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[13px]" style={{ background: "var(--tf-fill-06)", color: "var(--tf-ink-muted)" }}>
        {n}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Stepper */}
      <GlassPanel className="px-6 py-4">
        <div className="flex items-center">
          {[
            { n: 1, label: "Add notes" },
            { n: 2, label: "Review AI results" },
            { n: 3, label: "Create tasks" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5 shrink-0">
                {stepCircle(s.n)}
                <span className="text-[14px] font-medium" style={{ color: step >= s.n ? "var(--tf-ink)" : "var(--tf-ink-muted)" }}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div className="flex-1 mx-4 h-px" style={{ background: "var(--tf-panel-border)" }} />
              )}
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left: notes */}
        <GlassPanel className="p-5">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div>
              <div className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                Your notes
              </div>
              <div className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>
                Paste raw notes or a call transcript.
              </div>
            </div>
            <div className="flex items-center gap-2">
              {notes && (
                <button onClick={startOver} className="flex items-center gap-1 text-[12px] hover:underline" style={{ color: "var(--tf-ink-muted)" }}>
                  <RotateCcw size={11} /> Start over
                </button>
              )}
              <label className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg cursor-pointer" style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}>
                <Upload size={12} /> Upload .txt
                <input type="file" accept=".txt,.md" className="hidden" onChange={onFile} />
              </label>
            </div>
          </div>
          {fileName && (
            <div className="flex items-center gap-1.5 text-[12px] mb-2" style={{ color: "var(--tf-ink-muted)" }}>
              <FileText size={12} /> {fileName}
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste raw meeting notes or a call transcript here..."
            rows={14}
            className="w-full text-[13px] leading-relaxed p-4 rounded-xl outline-none resize-none font-mono"
            style={fieldStyle}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap mt-3">
            <span className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
              {notes.trim()
                ? `${words} words${speakers.length ? ` · ${speakers.length} speaker${speakers.length === 1 ? "" : "s"} detected` : ""}`
                : "Paste or upload notes to begin"}
            </span>
            <Button variant="primary" loading={status === "processing"} icon={<Sparkles size={14} />} disabled={!notes.trim()} onClick={convert}>
              {status === "processing" ? "Converting..." : "✦ Convert with AI"}
            </Button>
          </div>
          <div className="mt-4 rounded-xl p-4" style={{ border: "1px solid var(--tf-panel-border)" }}>
            <div className="text-[13px] font-semibold" style={{ color: "var(--tf-ink)" }}>
              How it works.
            </div>
            <div className="text-[12.5px] mt-1 leading-snug" style={{ color: "var(--tf-ink-muted)" }}>
              Paste or upload notes, review the summary and action items, then create tasks in Backlog. AI is used when configured; otherwise a local rules-based extraction runs and is clearly labelled.
            </div>
          </div>
        </GlassPanel>

        {/* Right: AI results */}
        <div className="flex flex-col gap-5">
          <GlassPanel
            className="p-5"
            style={{ border: "1px solid color-mix(in srgb, var(--tf-teal) 35%, var(--tf-panel-border))" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} color="var(--tf-teal)" />
              <div className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                {result?.method === "local" ? "Extracted results" : "AI results"}
              </div>
              {result?.method === "local" && (
                <Badge color="var(--tf-warning)" textColor="var(--tf-warning-text)">
                  Basic extraction
                </Badge>
              )}
            </div>

            {status === "processing" && (
              <div role="status" className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Skeleton variant="text" width="30%" height={10} />
                  <Skeleton variant="text" width="95%" height={13} />
                  <Skeleton variant="text" width="78%" height={13} />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton variant="text" width="24%" height={10} />
                  <Skeleton variant="rect" height={44} />
                  <Skeleton variant="rect" height={44} />
                  <Skeleton variant="rect" height={44} />
                </div>
                <p className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                  Reading through the notes and pulling out action items...
                </p>
              </div>
            )}

            {status === "unavailable" && (
              <div role="alert" className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} color="var(--tf-warning)" />
                  <h2 className="text-[14px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                    Extraction is unavailable
                  </h2>
                </div>
                <p className="text-[13px] leading-snug" style={{ color: "var(--tf-ink-soft)" }}>
                  The assistant couldn&apos;t read your notes just now. Your text is still here — try again in a moment, or add tasks manually from the board.
                </p>
                <div>
                  <Button variant="primary" icon={<RotateCcw size={14} />} onClick={convert}>
                    Try again
                  </Button>
                </div>
              </div>
            )}

            {status === "idle" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} color="var(--tf-teal)" />
                  <h2 className="text-[14px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                    Here&apos;s what you get
                  </h2>
                </div>
                <ul className="flex flex-col gap-3">
                  <li className="flex gap-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--tf-fill-04)", color: "var(--tf-teal)" }}>
                      <FileText size={13} />
                    </span>
                    <span className="text-[13px] leading-snug" style={{ color: "var(--tf-ink-soft)" }}>
                      <span className="font-medium" style={{ color: "var(--tf-ink)" }}>Paste or upload your notes — </span>
                      raw meeting notes, a call transcript, or a .txt file.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--tf-fill-04)", color: "var(--tf-teal)" }}>
                      <ListChecks size={13} />
                    </span>
                    <span className="text-[13px] leading-snug" style={{ color: "var(--tf-ink-soft)" }}>
                      <span className="font-medium" style={{ color: "var(--tf-ink)" }}>Get a summary and action items — </span>
                      owners matched to your real team, with sensible priorities.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--tf-fill-04)", color: "var(--tf-teal)" }}>
                      <CheckSquare size={13} />
                    </span>
                    <span className="text-[13px] leading-snug" style={{ color: "var(--tf-ink-soft)" }}>
                      <span className="font-medium" style={{ color: "var(--tf-ink)" }}>Review and create tasks — </span>
                      keep what you agree with and send it straight to Backlog.
                    </span>
                  </li>
                </ul>
              </div>
            )}

            {status === "done" && result && (
              <>
                <PulseCard>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={15} color="var(--tf-teal)" />
                    <h2 className="text-[14px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                      Summary
                    </h2>
                  </div>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-soft)" }}>
                    {result.summary}
                  </p>
                </PulseCard>

                <GlassPanel className="p-5">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                    <div className="flex items-center gap-2">
                      <ListChecks size={16} color="var(--tf-primary)" />
                      <h2 className="text-[14px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                        Action items
                      </h2>
                      <span className="text-[11px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                        · {result.actionItems.length}
                      </span>
                    </div>
                    <button onClick={() => toggleAll(!allSelected)} className="flex items-center gap-1.5 text-[12px] hover:underline" style={{ color: "var(--tf-ink-muted)" }}>
                      {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <PriorityLegend className="mb-3" />
                  <div className="flex flex-col gap-2 max-h-96 overflow-y-auto tf-scroll pr-0.5">
                    {result.actionItems.map((item) => {
                      const person = members.find((p) => p.name === item.owner);
                      const labels = suggestLabels(item.title);
                      return (
                        <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl transition-opacity" style={{ border: "1px solid var(--tf-panel-border)", opacity: item.selected ? 1 : 0.5 }}>
                          <button
                            onClick={() => toggleItem(item.id)}
                            aria-label={item.selected ? `Deselect ${item.title}` : `Select ${item.title}`}
                            className="mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0"
                            style={{ borderColor: item.selected ? "var(--tf-primary)" : "#3A455C", background: item.selected ? "var(--tf-primary)" : "transparent" }}
                          >
                            {item.selected && <Check size={12} color="white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <input
                              value={item.title}
                              onChange={(e) => updateItem(item.id, "title", e.target.value)}
                              aria-label="Action item title"
                              className="w-full text-[14px] font-medium outline-none bg-transparent"
                              style={{ color: "var(--tf-ink)" }}
                            />
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <select
                                value={item.owner}
                                onChange={(e) => updateItem(item.id, "owner", e.target.value)}
                                aria-label="Owner"
                                className="text-[11px] rounded-lg px-2 py-1 outline-none"
                                style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
                              >
                                <option value="">Unassigned</option>
                                {members.map((p) => (
                                  <option key={p.name}>{p.name}</option>
                                ))}
                              </select>
                              <select
                                value={item.priority}
                                onChange={(e) => updateItem(item.id, "priority", e.target.value)}
                                aria-label="Priority"
                                className={`text-[11px] font-medium rounded-full px-2 py-1 outline-none border-none ${PRIORITY_STYLE[item.priority]}`}
                                style={{ background: "var(--tf-surface)" }}
                              >
                                {PRIORITIES.map((p) => (
                                  <option key={p}>{p}</option>
                                ))}
                              </select>
                              {person && <Avatar initials={person.initials} color={person.color} size={20} />}
                              {labels.map((l) => (
                                <Badge key={l} color="var(--tf-teal)">
                                  {l}
                                </Badge>
                              ))}
                              <DueDateControl
                                value={item.dueDate ?? null}
                                onChange={(v) => updateItem(item.id, "dueDate", v ?? "")}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                        Send to
                      </span>
                      <DropdownMenu
                        trigger={
                          <button className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}>
                            {sendTo} <span style={{ color: "var(--tf-ink-muted)" }}>▾</span>
                          </button>
                        }
                        groups={[{ items: COLUMNS.map((c) => ({ label: c, onSelect: () => setSendTo(c as TaskColumn) })) }]}
                      />
                      <span className="text-[11px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                        · {result.project}
                      </span>
                    </div>
                    {createdCount !== null ? (
                      <span className="text-[13px] flex items-center gap-1.5 font-medium" style={{ color: "var(--tf-teal)" }}>
                        <Check size={14} /> {createdCount} task{createdCount === 1 ? "" : "s"} created in {sendTo}
                      </span>
                    ) : (
                      <Button variant="teal" icon={<ArrowRight size={14} />} disabled={selectedCount === 0} onClick={createTasks}>
                        Create {selectedCount} task{selectedCount === 1 ? "" : "s"}
                      </Button>
                    )}
                  </div>
                </GlassPanel>
              </>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
