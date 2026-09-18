import { useState } from "react";
import { Sparkles, Upload, FileText, Check, Loader2, ArrowRight, ListChecks, RotateCcw, CheckSquare, Square } from "lucide-react";
import { GlassPanel, PulseCard, Avatar } from "../ui/Primitives";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { PriorityLegend } from "../ui/PriorityLegend";
import { PRIORITY_STYLE, SAMPLE_MEETING_NOTES } from "../../data/mockData";
import { useTeam } from "../../context/TeamContext";
import { suggestLabels } from "../../lib/nlp";
import { useTasks } from "../../context/TasksContext";
import type { ActionItem, Priority, Task } from "../../types";

interface ExtractResult {
  summary: string;
  actionItems: ActionItem[];
  project: string;
}

// Mock extraction — swap this for `api.post('/ai/meeting-notes', { project_id, notes })`
// against the taskflow-api backend once you're ready to wire it up for real.
// Owners are assigned from the real current team (cycling through whoever
// exists) rather than fictional names, since this sample is meant to show
// what conversion looks like against your actual account, not a demo cast.
function mockExtract(memberNames: string[]): ExtractResult {
  const owner = (i: number) => memberNames[i % Math.max(memberNames.length, 1)] ?? "Unassigned";
  return {
    project: "Platform Core",
    summary:
      "The team reviewed sprint progress. Risk detection is nearly ready pending load tests, the summarizer prompt has an owner-detection bug, and the Slack integration is blocked on OAuth review. Calendar sync was deprioritized to next sprint.",
    actionItems: [
      { id: "a1", title: "Load test the AI risk-detection worker before Friday demo", owner: owner(0), priority: "Critical", selected: true },
      { id: "a2", title: "Fix owner-detection bug in meeting-notes summarizer", owner: owner(1), priority: "High", selected: true },
      { id: "a3", title: "Follow up with client on delayed billing wireframe feedback", owner: owner(2), priority: "Medium", selected: true },
      { id: "a4", title: "Write load tests for AI task-generation endpoint", owner: owner(0), priority: "High", selected: true },
      { id: "a5", title: "Investigate Slack OAuth app review delay", owner: owner(3), priority: "Medium", selected: false },
    ],
  };
}

export function MeetingNotesConverter() {
  const { addTask } = useTasks();
  const { members } = useTeam();
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [createdCount, setCreatedCount] = useState<number | null>(null);

  function loadSample() {
    setNotes(SAMPLE_MEETING_NOTES);
    setFileName(null);
    reset();
  }

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

  function convert() {
    if (!notes.trim()) return;
    setStatus("processing");
    setCreatedCount(null);
    setTimeout(() => {
      setResult(mockExtract(members.map((m) => m.name)));
      setStatus("done");
    }, 1100);
  }

  function toggleItem(id: string) {
    setResult((r) => (r ? { ...r, actionItems: r.actionItems.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)) } : r));
  }
  function updateItem(id: string, field: "title" | "owner" | "priority", value: string) {
    setResult((r) =>
      r ? { ...r, actionItems: r.actionItems.map((i) => (i.id === id ? { ...i, [field]: value as Priority & string } : i)) } : r
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
        due: "No due date",
        column: "Backlog",
        labels: suggestLabels(item.title),
      };
      addTask(task);
    });
    setCreatedCount(selected.length);
  }

  const selectedCount = result?.actionItems.filter((i) => i.selected).length ?? 0;
  const allSelected = result ? result.actionItems.every((i) => i.selected) : false;
  const fieldStyle = { background: "rgba(255,255,255,0.03)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" };

  return (
    <div className="max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <GlassPanel className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              Meeting notes
            </span>
            <div className="flex items-center gap-2">
              {notes && (
                <button onClick={startOver} className="flex items-center gap-1 text-xs" style={{ color: "var(--tf-ink-muted)" }}>
                  <RotateCcw size={11} /> Start over
                </button>
              )}
              <button onClick={loadSample} className="text-xs" style={{ color: "var(--tf-ink-muted)" }}>
                Load sample
              </button>
              <label className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer" style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}>
                <Upload size={12} /> Upload .txt
                <input type="file" accept=".txt,.md" className="hidden" onChange={onFile} />
              </label>
            </div>
          </div>
          {fileName && (
            <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color: "var(--tf-ink-muted)" }}>
              <FileText size={12} /> {fileName}
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste raw meeting notes or a call transcript here..."
            rows={14}
            className="w-full text-sm leading-relaxed p-3 rounded-xl outline-none resize-none font-mono"
            style={fieldStyle}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
              {notes.trim() ? `${notes.trim().split(/\s+/).length} words` : "Paste or upload notes to begin"}
            </span>
            <Button variant="primary" icon={status === "processing" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} disabled={!notes.trim() || status === "processing"} onClick={convert}>
              {status === "processing" ? "Converting..." : "Convert with AI"}
            </Button>
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-5">
          {status !== "done" && (
            <GlassPanel className="p-8 text-center">
              <ListChecks size={22} className="mx-auto mb-2" style={{ color: "var(--tf-ink-muted)" }} />
              <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>
                {status === "processing"
                  ? "Reading through the notes and pulling out action items..."
                  : "The summary and action items will appear here once you convert your notes."}
              </p>
            </GlassPanel>
          )}

          {status === "done" && result && (
            <>
              <PulseCard>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={15} color="#14B8A6" />
                  <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                    Summary
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#C7D2E3" }}>
                  {result.summary}
                </p>
              </PulseCard>

              <GlassPanel className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListChecks size={16} color="#2563EB" />
                    <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                      Action items
                    </h3>
                  </div>
                  <button onClick={() => toggleAll(!allSelected)} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--tf-ink-muted)" }}>
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
                            className="w-full text-sm font-medium outline-none bg-transparent"
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
                              {Object.keys(PRIORITY_STYLE).map((p) => (
                                <option key={p}>{p}</option>
                              ))}
                            </select>
                            {person && <Avatar initials={person.initials} color={person.color} size={20} />}
                            {labels.map((l) => (
                              <Badge key={l} color="var(--tf-teal)">
                                {l}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                    Will land in "{result.project}" · Backlog
                  </span>
                  {createdCount !== null ? (
                    <span className="text-sm flex items-center gap-1.5 font-medium" style={{ color: "var(--tf-teal)" }}>
                      <Check size={14} /> {createdCount} task{createdCount === 1 ? "" : "s"} created in Backlog
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
        </div>
      </div>
    </div>
  );
}
