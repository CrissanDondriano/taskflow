import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { Modal } from "../ui/Primitives";
import { Button } from "../ui/Button";
import { PRIORITIES } from "../../data/mockData";
import { useTeamMembers } from "../../context/TeamContext";
import { useTasksStore } from "../../stores/tasksStore";
import { useTeamStore } from "../../stores/teamStore";
import { api, ApiError } from "../../lib/api";
import { isUpgradeRequired } from "../../lib/billing";
import {
  type ApiReviewTask,
  type ReviewRow,
  blankRow,
  formatDueShort,
  toApprovePayload,
  toReviewRow,
  validatePlanFile,
} from "../../lib/planImport";
import type { Priority } from "../../types";

type Step = "upload" | "processing" | "review" | "creating" | "success" | "error";

interface ImportStatus {
  id: number;
  status: string;
  tasks: ApiReviewTask[];
  error_message: string | null;
}

const fieldStyle = {
  background: "var(--tf-fill-04)",
  border: "1px solid var(--tf-panel-border)",
  color: "var(--tf-ink)",
} as const;

/**
 * Upload a project plan → AI extracts tasks → review, reassign and create.
 * Steps: pick a file → watch extraction (polled) → edit the rows in a
 * table → approve into a project. Everything the server knows is shown;
 * nothing is created until "Create tasks" is pressed.
 */
export function PlanImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const members = useTeamMembers();
  const projects = useTasksStore((s) => s.projects);
  const teamId = useTeamStore((s) => s.team?.id ?? null);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importId, setImportId] = useState<number | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [projectId, setProjectId] = useState<number | "">("");
  const [createdCount, setCreatedCount] = useState(0);
  const [quotaHit, setQuotaHit] = useState(false);
  const polls = useRef(0);

  function reset() {
    setStep("upload");
    setFile(null);
    setError(null);
    setQuotaHit(false);
    setImportId(null);
    setRows([]);
    setCreatedCount(0);
    polls.current = 0;
  }

  function close() {
    reset();
    onClose();
  }

  function pick(next: File | null) {
    if (!next) return;
    const problem = validatePlanFile(next);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setFile(next);
  }

  async function startUpload() {
    if (!file) return;
    if (!teamId) {
      setError("You need a team before importing — invite a member from the Team page first.");
      return;
    }
    setError(null);
    setQuotaHit(false);
    setStep("processing");
    polls.current = 0;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.upload<{ data: { id: number } }>(`/teams/${teamId}/plan-imports`, form);
      setImportId(res.data.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't upload that file.");
      setQuotaHit(isUpgradeRequired(err));
      setStep("error");
    }
  }

  // Poll the import status while the queue works through it.
  useEffect(() => {
    if (!open || step !== "processing" || importId === null) return;
    let cancelled = false;
    async function poll() {
      polls.current += 1;
      try {
        const res = await api.get<{ data: ImportStatus }>(`/plan-imports/${importId}`);
        if (cancelled) return;
        const status = res.data.status;
        if (status === "ready") {
          setRows(res.data.tasks.map(toReviewRow));
          setProjectId((prev) => (prev === "" && projects.length > 0 ? projects[0].id : prev));
          setStep("review");
        } else if (status === "failed") {
          setError(res.data.error_message ?? "Extraction failed.");
          setStep("error");
        } else if (polls.current > 90) {
          setError("This is taking unusually long — the queue may be backed up. Try again in a minute.");
          setStep("error");
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Couldn't check the import status.");
        setStep("error");
      }
    }
    void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, step, importId, projects]);

  function patchRow(key: string, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function approve() {
    if (importId === null || projectId === "") return;
    const payload = toApprovePayload(rows);
    if (payload.length === 0) {
      setError("Add at least one titled task before creating.");
      return;
    }
    setError(null);
    setQuotaHit(false);
    setStep("creating");
    try {
      const res = await api.post<{ data: { tasks_created: number } }>(`/plan-imports/${importId}/approve`, {
        project_id: projectId,
        tasks: payload,
      });
      setCreatedCount(res.data.tasks_created);
      // The new tasks live server-side now — refresh the workspace so the
      // board shows them without a page reload.
      await useTasksStore.getState().load().catch(() => undefined);
      setStep("success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the tasks.");
      setQuotaHit(isUpgradeRequired(err));
      setStep("review");
    }
  }

  return (
    <Modal open={open} onClose={close} title="Import plan" wide>
      {step === "upload" && (
        <div className="flex flex-col gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pick(e.dataTransfer.files?.[0] ?? null);
            }}
            className="rounded-xl border border-dashed px-4 py-10 text-center transition-colors"
            style={{ borderColor: dragOver ? "var(--tf-primary)" : "var(--tf-panel-border)", background: dragOver ? "rgba(37,99,235,0.06)" : "transparent" }}
          >
            <UploadCloud size={26} className="mx-auto mb-2" style={{ color: "var(--tf-ink-muted)" }} />
            <p className="text-sm" style={{ color: "var(--tf-ink)" }}>
              Drag a plan file here, or{" "}
              <label htmlFor="plan-file" className="font-medium cursor-pointer hover:underline" style={{ color: "var(--tf-primary)" }}>
                browse
              </label>
              <input
                id="plan-file"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="sr-only"
                onChange={(e) => {
                  pick(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </p>
            <p className="text-[11px] font-mono mt-1.5" style={{ color: "var(--tf-ink-muted)" }}>
              PDF · DOCX · TXT · MD — max 10MB, stored privately
            </p>
          </div>

          {file && (
            <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm" style={{ background: "var(--tf-fill-03)", border: "1px solid var(--tf-panel-border)" }}>
              <span className="truncate" style={{ color: "var(--tf-ink)" }}>
                {file.name}
              </span>
              <button onClick={() => setFile(null)} aria-label="Remove file" className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-white/5" style={{ color: "var(--tf-ink-muted)" }}>
                <X size={13} />
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs" style={{ color: "var(--tf-danger)" }}>
              {error}
            </p>
          )}
          {quotaHit && (
            <Link
              to="/dashboard/billing"
              onClick={close}
              className="text-xs font-medium hover:underline self-start"
              style={{ color: "var(--tf-primary)" }}
            >
              View plans and usage →
            </Link>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" icon={<FileUp size={14} />} onClick={() => void startUpload()} disabled={!file}>
              Extract tasks
            </Button>
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center gap-3 py-12" role="status" aria-live="polite">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-teal)" }} />
          <p className="text-sm" style={{ color: "var(--tf-ink)" }}>
            Reading “{file?.name}” and drafting tasks…
          </p>
          <p className="text-[11px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
            Larger plans take a little longer — you can keep working.
          </p>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <p className="text-xs" style={{ color: "var(--tf-ink-muted)" }}>
              Review everything before it becomes real — nothing is created until you press “Create tasks”.
            </p>
            <label className="flex items-center gap-2 text-xs shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
              Into project
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value === "" ? "" : Number(e.target.value))}
                className="text-[13px] px-2.5 py-1.5 rounded-lg outline-none"
                style={fieldStyle}
                aria-label="Target project"
              >
                <option value="">Choose…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "var(--tf-surface)" }}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {projects.length === 0 && (
            <p className="text-xs rounded-xl px-3 py-2" style={{ background: "rgba(245,158,11,0.08)", color: "var(--tf-warning-text, #b45309)", border: "1px solid rgba(245,158,11,0.3)" }}>
              You don't have a project yet — create any task first and it will appear here as the target.
            </p>
          )}

          <div className="overflow-x-auto tf-scroll -mx-1 px-1">
            <table className="w-full text-[13px] min-w-[720px]">
              <thead>
                <tr className="text-left" style={{ color: "var(--tf-ink-muted)" }}>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 pr-2 font-normal">Task</th>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 pr-2 font-normal">Priority</th>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 pr-2 font-normal">Due</th>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 pr-2 font-normal">Role</th>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 pr-2 font-normal">Assignee</th>
                  <th className="pb-2 w-8" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const unassigned = row.assigneeId === "";
                  return (
                    <tr key={row.key} style={{ borderTop: "1px solid var(--tf-panel-border)" }} className="align-top">
                      <td className="py-2 pr-2 min-w-[220px]">
                        <input
                          value={row.title}
                          onChange={(e) => patchRow(row.key, { title: e.target.value })}
                          placeholder="Task title"
                          aria-label="Task title"
                          className="w-full text-[13px] font-medium px-2 py-1.5 rounded-lg outline-none mb-1"
                          style={fieldStyle}
                        />
                        <input
                          value={row.description}
                          onChange={(e) => patchRow(row.key, { description: e.target.value })}
                          placeholder="Description (optional)"
                          aria-label="Task description"
                          className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                          style={fieldStyle}
                        />
                        {row.dependsOn.length > 0 && (
                          <p className="text-[11px] font-mono mt-1" style={{ color: "var(--tf-ink-muted)" }}>
                            After: {row.dependsOn.join(", ")}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <select
                          value={row.priority}
                          onChange={(e) => patchRow(row.key, { priority: e.target.value as Priority })}
                          aria-label="Priority"
                          className="text-[13px] px-2 py-1.5 rounded-lg outline-none"
                          style={fieldStyle}
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p} value={p} style={{ background: "var(--tf-surface)" }}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="date"
                          value={row.dueDate}
                          onChange={(e) => patchRow(row.key, { dueDate: e.target.value })}
                          aria-label="Due date"
                          className="text-[13px] px-2 py-1.5 rounded-lg outline-none"
                          style={fieldStyle}
                        />
                        {row.dueDate && (
                          <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                            {formatDueShort(row.dueDate)}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          value={row.requiredRole}
                          onChange={(e) => patchRow(row.key, { requiredRole: e.target.value })}
                          placeholder="Role"
                          aria-label="Required role"
                          className="w-28 text-[13px] px-2 py-1.5 rounded-lg outline-none"
                          style={fieldStyle}
                        />
                      </td>
                      <td className="py-2 pr-2 min-w-[160px]">
                        <select
                          value={row.assigneeId}
                          onChange={(e) => {
                            const id = e.target.value === "" ? "" : Number(e.target.value);
                            const person = members.find((m) => m.id === id);
                            patchRow(row.key, {
                              assigneeId: id,
                              assigneeName: person?.name ?? "",
                            });
                          }}
                          aria-label={`Assignee for ${row.title || "untitled task"}`}
                          className="w-full text-[13px] px-2 py-1.5 rounded-lg outline-none"
                          style={{
                            ...fieldStyle,
                            border: unassigned ? "1px solid rgba(245,158,11,0.5)" : fieldStyle.border,
                          }}
                        >
                          <option value="" style={{ background: "var(--tf-surface)" }}>
                            Unassigned
                          </option>
                          {members
                            .filter((m) => m.id !== undefined)
                            .map((m) => (
                              <option key={m.id} value={m.id} style={{ background: "var(--tf-surface)" }}>
                                {m.jobTitle ? `${m.name} — ${m.jobTitle}` : m.name}
                              </option>
                            ))}
                        </select>
                        {unassigned && (
                          <p className="flex items-center gap-1 text-[11px] mt-1" style={{ color: "var(--tf-warning-text, #b45309)" }}>
                            <AlertTriangle size={11} aria-hidden="true" />
                            {row.requiredRole ? `No ${row.requiredRole} on the team` : "Pick someone"}
                          </p>
                        )}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                          aria-label={`Delete ${row.title || "untitled task"}`}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                          style={{ color: "var(--tf-ink-muted)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setRows((prev) => [...prev, blankRow()])}
            className="self-start flex items-center gap-1.5 text-xs transition-colors hover:bg-white/5 px-2.5 py-1.5 rounded-lg"
            style={{ color: "var(--tf-ink-muted)" }}
          >
            <Plus size={13} /> Add a row
          </button>

          {error && (
            <p className="text-xs" style={{ color: "var(--tf-danger)" }}>
              {error}
            </p>
          )}
          {quotaHit && (
            <Link
              to="/dashboard/billing"
              onClick={close}
              className="text-xs font-medium hover:underline self-start"
              style={{ color: "var(--tf-primary)" }}
            >
              View plans and usage →
            </Link>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Discard
            </Button>
            <Button variant="primary" onClick={() => void approve()} disabled={projectId === "" || rows.length === 0}>
              Create {toApproveCount(rows)} task{toApproveCount(rows) === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}

      {step === "creating" && (
        <div className="flex flex-col items-center gap-3 py-12" role="status" aria-live="polite">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--tf-teal)" }} />
          <p className="text-sm" style={{ color: "var(--tf-ink)" }}>
            Creating tasks on the board…
          </p>
        </div>
      )}

      {step === "error" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle size={26} style={{ color: "var(--tf-danger)" }} />
          <p className="text-sm max-w-md" style={{ color: "var(--tf-ink)" }}>
            {error ?? "Something went wrong."}
          </p>
          {quotaHit && (
            <Link
              to="/dashboard/billing"
              onClick={close}
              className="text-sm font-medium hover:underline"
              style={{ color: "var(--tf-primary)" }}
            >
              View plans and usage →
            </Link>
          )}
          <div className="flex gap-2 mt-1">
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            <Button variant="primary" onClick={reset}>
              Try another file
            </Button>
          </div>
        </div>
      )}

      {step === "success" && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 size={30} color="#22C55E" />
          <p className="text-sm" style={{ color: "var(--tf-ink)" }}>
            {createdCount} task{createdCount === 1 ? "" : "s"} created and assigned — they're on your board now.
          </p>
          <div className="flex gap-2 mt-1">
            <Link
              to="/dashboard/kanban"
              onClick={close}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--tf-primary)" }}
            >
              Open the Kanban board
            </Link>
            <Button variant="secondary" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function toApproveCount(rows: ReviewRow[]): number {
  return rows.filter((r) => r.title.trim() !== "").length;
}
