import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  FileSpreadsheet,
  FileText as FileTextIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { GlassPanel, EmptyState } from "../../components/ui/Primitives";
import { useTasksData } from "../../context/TasksContext";
import { useTeamMembers } from "../../context/TeamContext";
import { withComputedWorkload } from "../../lib/team";
import {
  computeCompletionSeries,
  computeProjectReport,
  computeReportMetrics,
  type ProjectHealth,
  type TrendRange,
} from "../../lib/reports";
import { API_URL, ApiError, download } from "../../lib/api";
import { formatDueDate } from "../../lib/taskAdapter";
import { useToast } from "../../context/ToastContext";
import { COLUMNS } from "../../data/mockData";

const RANGES: { key: TrendRange; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
];

const COLUMN_LABEL: Record<string, string> = {
  Completed: "Done",
  "To Do": "To do",
  "In Progress": "In progress",
};

const HEALTH_STYLE: Record<ProjectHealth, { bg: string; fg: string }> = {
  Completed: { bg: "rgba(34,197,94,0.12)", fg: "var(--tf-success-text)" },
  "On track": { bg: "rgba(20,184,166,0.12)", fg: "var(--tf-accent-text)" },
  Watch: { bg: "rgba(245,158,11,0.12)", fg: "var(--tf-warning-text)" },
  "At risk": { bg: "rgba(239,68,68,0.12)", fg: "var(--tf-danger-text)" },
};

/** "2026-11-03" → "Tomorrow" when it's near, otherwise "Nov 3". */
function dueLabel(iso: string | null): string {
  if (!iso) return "—";
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const due = new Date(`${iso}T00:00:00`).getTime();
  const diff = Math.round((due - start) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDueDate(iso);
}

function ExportButton({ label, icon, path }: { label: string; icon: React.ReactNode; path: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  // Authenticated download: the export endpoints sit behind sanctum, which a
  // plain <a href> can't satisfy — fetch with the bearer token instead.
  async function run() {
    setBusy(true);
    try {
      await download(path);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't download the export.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={busy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] transition-colors hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ color: "var(--tf-ink-muted)" }}
      title={`Downloads from ${API_URL}`}
    >
      {icon} {busy ? "Preparing..." : label}
    </button>
  );
}

function StatCard({
  label,
  value,
  caption,
  chip,
  chipTone = "muted",
}: {
  label: string;
  value: string | number;
  caption: string;
  chip?: string;
  chipTone?: "up" | "down" | "muted" | "danger" | "success";
}) {
  const toneColor =
    chipTone === "up" || chipTone === "success"
      ? "var(--tf-success)"
      : chipTone === "down" || chipTone === "danger"
        ? "var(--tf-danger)"
        : "var(--tf-ink-muted)";
  return (
    <GlassPanel className="p-5 flex flex-col">
      <div className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>
        {label}
      </div>
      <div className="text-[30px] font-display font-semibold leading-none mt-2" style={{ color: "var(--tf-ink)" }}>
        {value}
      </div>
      <div className="flex items-center justify-between gap-2 mt-auto pt-5 text-[12px]">
        <span style={{ color: "var(--tf-ink-muted)" }}>{caption}</span>
        {chip && (
          <span className="flex items-center gap-1 font-mono" style={{ color: toneColor }}>
            {chipTone === "up" && <ArrowUpRight size={12} aria-hidden="true" />}
            {chipTone === "down" && <ArrowDownRight size={12} aria-hidden="true" />}
            {chip}
          </span>
        )}
      </div>
    </GlassPanel>
  );
}

export function ReportsPage() {
  const [tab, setTab] = useState<"projects" | "team">("projects");
  const [range, setRange] = useState<TrendRange>("weekly");
  const tasks = useTasksData();
  const members = useTeamMembers();

  const nameFor = useMemo(
    () => (initials: string) => members.find((m) => m.initials === initials)?.name ?? initials,
    [members]
  );

  const metrics = useMemo(() => computeReportMetrics(tasks), [tasks]);
  const series = useMemo(() => computeCompletionSeries(tasks, range), [tasks, range]);
  const hasSeries = series.some((p) => p.created > 0 || p.done > 0);
  const projectRows = useMemo(() => computeProjectReport(tasks, nameFor), [tasks, nameFor]);
  const teamPerformance = useMemo(() => withComputedWorkload(members, tasks), [members, tasks]);

  const statusCounts = COLUMNS.map((column) => ({
    column,
    label: COLUMN_LABEL[column] ?? column,
    count: tasks.filter((t) => t.column === column).length,
  }));

  const deltaChip =
    metrics.completedDeltaPct === null
      ? "No prior period"
      : `${metrics.completedDeltaPct >= 0 ? "+" : ""}${metrics.completedDeltaPct.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-5">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tasks completed"
          value={metrics.completedLast30}
          caption="Last 30 days"
          chip={deltaChip}
          chipTone={metrics.completedDeltaPct === null ? "muted" : metrics.completedDeltaPct >= 0 ? "up" : "down"}
        />
        <StatCard
          label="On-time rate"
          value={metrics.onTimeRate === null ? "—" : `${metrics.onTimeRate}%`}
          caption="Last 30 days"
          chip={metrics.onTimeRate === null ? "No due dates" : "of due tasks"}
          chipTone="muted"
        />
        <StatCard
          label="Avg. completion time"
          value={metrics.avgCompletionDays === null ? "—" : `${metrics.avgCompletionDays} days`}
          caption="Last 30 days"
          chip="per task"
          chipTone="muted"
        />
        <StatCard
          label="At-risk tasks"
          value={metrics.atRiskNow}
          caption="Right now"
          chip={metrics.atRiskNow > 0 ? "Needs attention" : "All clear"}
          chipTone={metrics.atRiskNow > 0 ? "danger" : "success"}
        />
      </div>

      {/* Trend + status breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-stretch">
        <GlassPanel className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                Weekly completion trend
              </h2>
              <p className="text-[12.5px] mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                Tasks created vs completed.
              </p>
            </div>
            <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "var(--tf-fill-03)" }}>
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  aria-pressed={range === r.key}
                  className="px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors"
                  style={{
                    background: range === r.key ? "var(--tf-fill-12)" : "transparent",
                    color: range === r.key ? "var(--tf-ink)" : "var(--tf-ink-muted)",
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {hasSeries ? (
            <>
              <div className="flex items-center gap-4 mt-4 text-[11.5px]" style={{ color: "var(--tf-ink-muted)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--tf-primary)" }} /> Created
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--tf-teal)" }} /> Completed
                </span>
              </div>
              <div className="mt-2 -ml-3">
                <ResponsiveContainer width="100%" height={232}>
                  <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--tf-primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--tf-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillDone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--tf-teal)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--tf-teal)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--tf-panel-border)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--tf-ink-muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--tf-panel-border)",
                        background: "var(--tf-surface)",
                        fontSize: 12,
                        color: "var(--tf-ink)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="created"
                      name="Created"
                      stroke="var(--tf-primary)"
                      strokeWidth={2}
                      fill="url(#fillCreated)"
                    />
                    <Area
                      type="monotone"
                      dataKey="done"
                      name="Completed"
                      stroke="var(--tf-teal)"
                      strokeWidth={2}
                      fill="url(#fillDone)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<TrendingUp size={22} />}
              message="Complete a task to start building this trend."
              action={
                <Link
                  to="/dashboard/kanban"
                  className="text-[13px] font-medium hover:underline"
                  style={{ color: "var(--tf-primary)" }}
                >
                  Open the Kanban board →
                </Link>
              }
            />
          )}
        </GlassPanel>

        <GlassPanel className="p-5">
          <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            Status breakdown
          </h2>
          <div className="flex flex-col mt-3">
            {statusCounts.map((row) => (
              <div
                key={row.column}
                className="flex items-center justify-between gap-3 py-2.5"
                style={{ borderTop: "1px solid var(--tf-panel-border)" }}
              >
                <span className="text-[13px]" style={{ color: "var(--tf-ink-soft)" }}>
                  {row.label}
                </span>
                <span className="text-[13px] font-mono" style={{ color: "var(--tf-ink)" }}>
                  {row.count}
                </span>
              </div>
            ))}
          </div>
          <div
            className="flex items-center justify-between gap-3 mt-4 pt-3 text-[12px]"
            style={{ borderTop: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
          >
            <span>Total</span>
            <span className="font-mono" style={{ color: "var(--tf-ink)" }}>
              {tasks.length}
            </span>
          </div>
        </GlassPanel>
      </div>

      {/* Project status / team performance */}
      <GlassPanel className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            {(
              [
                { key: "projects" as const, label: "Project Status" },
                { key: "team" as const, label: "Team Performance" },
              ]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className="pb-1.5 text-[13px] font-medium transition-colors"
                style={{
                  color: tab === t.key ? "var(--tf-ink)" : "var(--tf-ink-muted)",
                  borderBottom: tab === t.key ? "2px solid var(--tf-primary)" : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <ExportButton
              label="PDF"
              icon={<FileTextIcon size={13} />}
              path="/reports/project-status/export?format=pdf"
            />
            <ExportButton
              label="Excel"
              icon={<FileSpreadsheet size={13} />}
              path={`/reports/${tab === "projects" ? "project-status" : "team-performance"}/export?format=xlsx`}
            />
            <ExportButton
              label="csv"
              icon={<Download size={13} />}
              path={`/reports/${tab === "projects" ? "project-status" : "team-performance"}/export?format=csv`}
            />
          </div>
        </div>

        <div className="mt-4">
          {tab === "projects" ? (
            projectRows.length === 0 ? (
              <p className="text-[13px] py-8 text-center" style={{ color: "var(--tf-ink-muted)" }}>
                No projects yet — create a task with a project name to see it here.
              </p>
            ) : (
              <div className="overflow-x-auto tf-scroll">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left" style={{ color: "var(--tf-ink-muted)" }}>
                      <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">PROJECT</th>
                      <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">OWNER</th>
                      <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">TASKS</th>
                      <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">PROGRESS</th>
                      <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">STATUS</th>
                      <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2">DUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectRows.map((p) => {
                      const health = HEALTH_STYLE[p.status];
                      return (
                        <tr key={p.name} style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
                          <td className="py-3 pr-4 font-medium" style={{ color: "var(--tf-ink)" }}>
                            {p.name}
                          </td>
                          <td className="py-3 pr-4" style={{ color: "var(--tf-ink-soft)" }}>
                            {p.owner}
                          </td>
                          <td className="py-3 pr-4 font-mono text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                            {p.tasks}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 w-36">
                              <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${p.progress}%`, background: "var(--tf-teal)" }}
                                />
                              </div>
                              <span className="text-[11px] font-mono w-8 text-right" style={{ color: "var(--tf-ink-muted)" }}>
                                {p.progress}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                              style={{ background: health.bg, color: health.fg }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: health.fg }} />
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                            {dueLabel(p.due)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : teamPerformance.length === 0 ? (
            <p className="text-[13px] py-8 text-center" style={{ color: "var(--tf-ink-muted)" }}>
              No team members yet — invite a teammate from the Team page to see their workload.
            </p>
          ) : (
            <div className="overflow-x-auto tf-scroll">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left" style={{ color: "var(--tf-ink-muted)" }}>
                    <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">NAME</th>
                    <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">ROLE</th>
                    <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2 pr-4">TASKS</th>
                    <th className="font-mono text-[10.5px] font-normal tracking-wide pb-2">WORKLOAD</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((p) => {
                    const assigned = tasks.filter((t) => t.assignee === p.initials);
                    const done = assigned.filter((t) => t.column === "Completed").length;
                    return (
                      <tr key={p.initials} style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
                        <td className="py-3 pr-4 font-medium" style={{ color: "var(--tf-ink)" }}>
                          {p.name}
                        </td>
                        <td className="py-3 pr-4 capitalize font-mono text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                          {p.role}
                        </td>
                        <td className="py-3 pr-4 font-mono text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                          {done}/{assigned.length}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 w-36">
                            <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
                              <div className="h-full rounded-full" style={{ width: `${p.workloadPct}%`, background: p.color }} />
                            </div>
                            <span className="text-[11px] font-mono w-8 text-right" style={{ color: "var(--tf-ink-muted)" }}>
                              {p.workloadPct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[11px] mt-4" style={{ color: "var(--tf-ink-muted)" }}>
          Exports download real files from your report exports, using your signed-in session.
        </p>
      </GlassPanel>
    </div>
  );
}
