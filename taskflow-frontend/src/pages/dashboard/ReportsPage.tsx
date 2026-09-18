import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText as FileTextIcon, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { GlassPanel, EmptyState } from "../../components/ui/Primitives";
import { useTasks } from "../../context/TasksContext";
import { useTeam } from "../../context/TeamContext";
import { withComputedWorkload } from "../../lib/team";
import { computeWeeklyTrend, computeProjectStatus } from "../../lib/reports";
import { API_URL } from "../../lib/api";

function statusColor(status: string) {
  if (status === "Active") return { bg: "rgba(37,99,235,0.1)", fg: "#93C5FD" };
  if (status === "Completed") return { bg: "rgba(34,197,94,0.1)", fg: "#86EFAC" };
  return { bg: "rgba(255,255,255,0.06)", fg: "var(--tf-ink-muted)" };
}

function ExportButton({ label, icon, href }: { label: string; icon: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]"
      style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
      title={`Downloads from ${API_URL}`}
    >
      {icon} {label}
    </a>
  );
}

export function ReportsPage() {
  const [tab, setTab] = useState<"projects" | "team">("projects");
  const { tasks } = useTasks();
  const { members } = useTeam();

  const trendData = useMemo(() => computeWeeklyTrend(tasks), [tasks]);
  const hasTrend = trendData.some((d) => d.done > 0);
  const projectStatus = useMemo(() => computeProjectStatus(tasks), [tasks]);
  const teamPerformance = useMemo(() => withComputedWorkload(members, tasks), [members, tasks]);

  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="p-5">
        <h3 className="text-[14px] font-semibold mb-4" style={{ color: "var(--tf-ink)" }}>
          Weekly completion trend
        </h3>
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
          <EmptyState icon={<TrendingUp size={22} />} message="Complete a task to start building this trend." />
        )}
      </GlassPanel>

      <GlassPanel className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.03)" }}>
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
              href={`${API_URL}/reports/project-status/export?format=pdf`}
            />
            <ExportButton
              label="Excel"
              icon={<FileSpreadsheet size={13} />}
              href={`${API_URL}/reports/${tab === "projects" ? "project-status" : "team-performance"}/export?format=xlsx`}
            />
            <ExportButton label="CSV" icon={<Download size={13} />} href={`${API_URL}/reports/${tab === "projects" ? "project-status" : "team-performance"}/export?format=csv`} />
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
                            <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
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
                        <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
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
          Export buttons link straight to your backend's export endpoints — they'll download a real file once{" "}
          <code className="font-mono">php artisan serve</code> is running.
        </p>
      </GlassPanel>
    </div>
  );
}
