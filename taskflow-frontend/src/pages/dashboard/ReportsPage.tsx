import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileSpreadsheet, FileText as FileTextIcon, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { GlassPanel, EmptyState } from "../../components/ui/Primitives";
import { useTasksData } from "../../context/TasksContext";
import { useTeamMembers } from "../../context/TeamContext";
import { withComputedWorkload } from "../../lib/team";
import { computeWeeklyTrend, computeProjectStatus } from "../../lib/reports";
import { API_URL, ApiError, download } from "../../lib/api";
import { useToast } from "../../context/ToastContext";

function statusColor(status: string) {
  if (status === "Active") return { bg: "rgba(37,99,235,0.1)", fg: "var(--tf-info-text)" };
  if (status === "Completed") return { bg: "rgba(34,197,94,0.1)", fg: "var(--tf-success-text)" };
  return { bg: "var(--tf-fill-06)", fg: "var(--tf-ink-muted)" };
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]"
      style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
      title={`Downloads from ${API_URL}`}
    >
      {icon} {busy ? "Preparing..." : label}
    </button>
  );
}

export function ReportsPage() {
  const [tab, setTab] = useState<"projects" | "team">("projects");
  const tasks = useTasksData();
  const members = useTeamMembers();

  const trendData = useMemo(() => computeWeeklyTrend(tasks), [tasks]);
  const hasTrend = trendData.some((d) => d.done > 0);
  const projectStatus = useMemo(() => computeProjectStatus(tasks), [tasks]);
  const teamPerformance = useMemo(() => withComputedWorkload(members, tasks), [members, tasks]);

  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="p-5">
        <h2 className="text-sm font-semibold font-display mb-4" style={{ color: "var(--tf-ink)" }}>
          Weekly completion trend
        </h2>
        {hasTrend ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="fillReport" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#7C8AA5" }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--tf-panel-border)", background: "var(--tf-surface)", fontSize: 12, color: "var(--tf-ink)" }} />
              <Area type="monotone" dataKey="done" stroke="#2563EB" strokeWidth={2} fill="url(#fillReport)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={<TrendingUp size={22} />}
            message="Complete a task to start building this trend."
            action={
              <Link to="/dashboard/kanban" className="text-[13px] font-medium" style={{ color: "var(--tf-primary)" }}>
                Open the Kanban board →
              </Link>
            }
          />
        )}
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "var(--tf-fill-03)" }}>
            {(["projects", "team"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize"
                style={{
                  background: tab === t ? "var(--tf-primary)" : "transparent",
                  color: tab === t ? "white" : "var(--tf-ink-muted)",
                }}
              >
                {t === "projects" ? "Project status" : "Team performance"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
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
              label="CSV"
              icon={<Download size={13} />}
              path={`/reports/${tab === "projects" ? "project-status" : "team-performance"}/export?format=csv`}
            />
          </div>
        </div>

        {tab === "projects" ? (
          projectStatus.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "var(--tf-ink-muted)" }}>
              No projects yet — create a task with a project name to see it here.
            </p>
          ) : (
            <div className="overflow-x-auto tf-scroll">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left" style={{ color: "var(--tf-ink-muted)" }}>
                    <th className="font-mono text-[11px] font-normal pb-2 pr-4">Project</th>
                    <th className="font-mono text-[11px] font-normal pb-2 pr-4">Status</th>
                    <th className="font-mono text-[11px] font-normal pb-2 pr-4">Tasks</th>
                    <th className="font-mono text-[11px] font-normal pb-2 pr-4">At risk</th>
                    <th className="font-mono text-[11px] font-normal pb-2">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {projectStatus.map((p) => {
                    const sc = statusColor(p.status);
                    return (
                      <tr key={p.name} style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
                        <td className="py-3 pr-4 font-medium" style={{ color: "var(--tf-ink)" }}>
                          {p.name}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.fg }}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-mono text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                          {p.completed}/{p.tasks}
                        </td>
                        <td className="py-3 pr-4 font-mono text-[12px]" style={{ color: p.atRisk > 0 ? "var(--tf-danger)" : "var(--tf-ink-muted)" }}>
                          {p.atRisk}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2 w-32">
                            <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
                              <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: "#14B8A6" }} />
                            </div>
                            <span className="text-[11px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                              {p.progress}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto tf-scroll">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: "var(--tf-ink-muted)" }}>
                  <th className="font-mono text-[11px] font-normal pb-2 pr-4">Name</th>
                  <th className="font-mono text-[11px] font-normal pb-2 pr-4">Role</th>
                  <th className="font-mono text-[11px] font-normal pb-2">Workload</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((p) => (
                  <tr key={p.initials} style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
                    <td className="py-3 pr-4 font-medium" style={{ color: "var(--tf-ink)" }}>
                      {p.name}
                    </td>
                    <td className="py-3 pr-4 capitalize font-mono text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
                      {p.role}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 w-32">
                        <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
                          <div className="h-full rounded-full" style={{ width: `${p.workloadPct}%`, background: p.color }} />
                        </div>
                        <span className="text-[11px] font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                          {p.workloadPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] mt-4" style={{ color: "var(--tf-ink-muted)" }}>
          Export buttons download real files from your backend's report exports, authenticated with your signed-in
          session.
        </p>
      </GlassPanel>
    </div>
  );
}
