import { useMemo, useState } from "react";
import { Sparkles, X, TrendingUp, ShieldCheck, Activity, CalendarClock, BarChart3 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { GlassPanel, PulseCard, Eyebrow, PriorityBadge, EmptyState } from "../../components/ui/Primitives";
import { PriorityLegend } from "../../components/ui/PriorityLegend";
import { CircularGauge } from "../../components/ui/CircularGauge";
import { MissionOrbit } from "../../components/dashboard/MissionOrbit";
import { UrgencyList } from "../../components/dashboard/UrgencyList";
import { COLUMNS } from "../../data/mockData";
import { computeInsights, computeRecommendation } from "../../lib/aiAssistant";
import { computeWeeklyTrend } from "../../lib/reports";
import { useTasks } from "../../context/TasksContext";
import { useTeam } from "../../context/TeamContext";
import { useNotifications } from "../../context/NotificationsContext";
import { withComputedWorkload } from "../../lib/team";
import { parseDueToAnchorDay } from "../../lib/calendar";
import type { Task } from "../../types";
import { useAuth } from "../../context/AuthContext";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function DashboardHome() {
  const { tasks } = useTasks();
  const { members } = useTeam();
  const { notifications } = useNotifications();
  const { user } = useAuth();
  const [selectedNode, setSelectedNode] = useState<Task | null>(null);
  const [hoveredId, setHoveredId] = useState<string | undefined>(undefined);

  const people = useMemo(() => withComputedWorkload(members, tasks), [members, tasks]);

  // Every number below is derived from the real, shared task list (TasksContext)
  // and real team data — create or complete a task and these update immediately.
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.column === "Completed").length;
    const pending = total - completed;
    const atRisk = tasks.filter((t) => t.atRisk).length;
    const dueToday = tasks.filter((t) => parseDueToAnchorDay(t.due) === 2);
    const dueTodayCompleted = dueToday.filter((t) => t.column === "Completed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const projectHealth = total > 0 ? Math.max(0, Math.round(100 - (atRisk / total) * 140)) : 100;

    const totalAssigned = tasks.filter((t) => t.assignee).length;
    const totalDone = tasks.filter((t) => t.assignee && t.column === "Completed").length;
    const teamEfficiency = totalAssigned > 0 ? Math.round((totalDone / totalAssigned) * 100) : 0;
    const aiScore = total > 0 ? Math.round((completionRate + projectHealth + teamEfficiency) / 3) : 0;

    return { total, completed, pending, atRisk, dueToday: dueToday.length, dueTodayCompleted, completionRate, projectHealth, teamEfficiency, aiScore };
  }, [tasks]);

  const recommendation = useMemo(() => computeRecommendation(tasks), [tasks]);
  const insights = useMemo(() => computeInsights(tasks, people), [tasks, people]);

  const upcomingDeadlines = useMemo(
    () =>
      tasks
        .filter((t) => t.column !== "Completed" && parseDueToAnchorDay(t.due) !== null)
        .sort((a, b) => (parseDueToAnchorDay(a.due) ?? 99) - (parseDueToAnchorDay(b.due) ?? 99))
        .slice(0, 5),
    [tasks]
  );

  // Real completion history — only exists once tasks have actually been
  // completed (completedAt is stamped by TasksContext). No fabricated
  // historical data is shown when this is empty.
  const trendData = useMemo(() => computeWeeklyTrend(tasks), [tasks]);
  const hasCompletionHistory = trendData.some((d) => d.done > 0);

  const columnDistribution = useMemo(() => COLUMNS.map((c) => ({ column: c, count: tasks.filter((t) => t.column === c).length })), [tasks]);

  const recentActivity = notifications.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Mission Control hero ---------- */}
      <GlassPanel className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--tf-success)", boxShadow: "0 0 6px var(--tf-success)" }} />
              <span className="text-[10px] font-mono tracking-[0.18em] uppercase" style={{ color: "var(--tf-ink-muted)" }}>
                {metrics.atRisk > 0 ? `${metrics.atRisk} item${metrics.atRisk === 1 ? "" : "s"} need attention` : "All systems nominal"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-semibold mb-3" style={{ color: "var(--tf-ink)" }}>
              {greeting()}, {user?.name?.split(" ")[0] ?? "there"}. Mission control is live.
            </h1>
            <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.25)" }}>
              <Sparkles size={15} className="mt-0.5 shrink-0" color="#93C5FD" />
              <p className="text-sm leading-snug" style={{ color: "#C7D2E3" }}>
                <span className="font-semibold" style={{ color: "var(--tf-ink)" }}>
                  AI recommendation:
                </span>{" "}
                {recommendation}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-8 shrink-0">
            <CircularGauge value={metrics.aiScore} size={92} color="var(--tf-teal)" sublabel="AI score" />
            <div className="hidden sm:block w-px self-stretch" style={{ background: "var(--tf-panel-border)" }} />
            <div className="flex flex-col gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
                  Today's progress
                </div>
                <div className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
                  {metrics.dueTodayCompleted}/{metrics.dueToday}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
                  Pending · Completed
                </div>
                <div className="text-base font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
                  <span style={{ color: "#93C5FD" }}>{metrics.pending}</span> <span style={{ color: "var(--tf-ink-muted)" }}>·</span>{" "}
                  <span style={{ color: "var(--tf-teal)" }}>{metrics.completed}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ---------- Smart analytics grid ---------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <GlassPanel className="p-4 flex flex-col items-center justify-center gap-2">
          <CircularGauge value={metrics.completionRate} size={64} strokeWidth={6} color="#2563EB" />
          <span className="text-[10px] font-mono uppercase tracking-wide text-center" style={{ color: "var(--tf-ink-muted)" }}>
            Completion rate
          </span>
        </GlassPanel>

        <GlassPanel className="p-4 flex flex-col items-center justify-center gap-2">
          <CircularGauge value={metrics.projectHealth} size={64} strokeWidth={6} color={metrics.projectHealth > 70 ? "#22C55E" : "#F59E0B"} />
          <span className="text-[10px] font-mono uppercase tracking-wide text-center" style={{ color: "var(--tf-ink-muted)" }}>
            Project health
          </span>
        </GlassPanel>

        <GlassPanel className="p-4 flex flex-col items-center justify-center gap-2">
          <CircularGauge value={metrics.teamEfficiency} size={64} strokeWidth={6} color="#14B8A6" />
          <span className="text-[10px] font-mono uppercase tracking-wide text-center" style={{ color: "var(--tf-ink-muted)" }}>
            Team efficiency
          </span>
        </GlassPanel>

        <GlassPanel className="p-4 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--tf-ink-muted)" }}>
            <ShieldCheck size={12} />
            <span className="text-[10px] font-mono uppercase tracking-wide">At risk</span>
          </div>
          <div className="text-xl font-display font-semibold" style={{ color: metrics.atRisk > 0 ? "var(--tf-danger)" : "var(--tf-ink)" }}>
            {metrics.atRisk}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4 flex flex-col justify-center">
          <div className="flex items-center gap-1.5 mb-1" style={{ color: "var(--tf-ink-muted)" }}>
            <Activity size={12} />
            <span className="text-[10px] font-mono uppercase tracking-wide">Total tasks</span>
          </div>
          <div className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            {metrics.total}
          </div>
        </GlassPanel>
      </div>

      {/* ---------- Mission Orbit + urgency list + AI insights ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <GlassPanel className="lg:col-span-3 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <Eyebrow>Mission orbit — live urgency map</Eyebrow>
              <h3 className="text-base font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                Open tasks by AI-assessed urgency
              </h3>
            </div>
            <PriorityLegend />
          </div>

          {tasks.length === 0 ? (
            <EmptyState icon={<Sparkles size={22} />} message="Create your first task and it'll show up here, positioned by how urgent the AI thinks it is." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-4 items-start">
              <MissionOrbit tasks={tasks} onSelect={setSelectedNode} selectedId={selectedNode?.id} hoveredId={hoveredId} onHover={setHoveredId} />
              <UrgencyList tasks={tasks} selectedId={selectedNode?.id} hoveredId={hoveredId} onSelect={setSelectedNode} onHover={setHoveredId} />
            </div>
          )}

          {selectedNode && (
            <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)" }}>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--tf-ink)" }}>
                  {selectedNode.title}
                </div>
                <div className="text-xs font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                  {selectedNode.project} · due {selectedNode.due}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={selectedNode.priority} />
                <button onClick={() => setSelectedNode(null)} aria-label="Deselect task" className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ color: "var(--tf-ink-muted)" }}>
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
        </GlassPanel>

        <PulseCard className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} color="#14B8A6" />
            <h3 className="text-base font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              AI insights
            </h3>
          </div>
          <Eyebrow color="#2563EB">Computed from current tasks</Eyebrow>
          <div className="flex flex-col gap-3 mt-2">
            {insights.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>
                {tasks.length === 0
                  ? "Insights will appear here once you've created some tasks."
                  : "Nothing stands out right now — no risk or imbalance detected."}
              </p>
            ) : (
              insights.map((line, i) => (
                <div key={i} className="text-sm leading-snug pl-3 border-l-2" style={{ color: "#C7D2E3", borderColor: "#14B8A6" }}>
                  {line}
                </div>
              ))
            )}
          </div>
        </PulseCard>
      </div>

      {/* ---------- Charts row ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassPanel className="p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <TrendingUp size={14} color="var(--tf-ink-muted)" />
            <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              Weekly completions
            </h3>
          </div>
          {hasCompletionHistory ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#7C8AA5" }} axisLine={false} tickLine={false} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--tf-panel-border)", background: "var(--tf-surface)", fontSize: 12, color: "var(--tf-ink)" }} />
                <Area type="monotone" dataKey="done" stroke="#14B8A6" strokeWidth={2} fill="url(#fillDone)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<TrendingUp size={22} />} message="Complete a task to start building your weekly trend." />
          )}
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <BarChart3 size={14} color="var(--tf-ink-muted)" />
            <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              Tasks by column
            </h3>
          </div>
          {tasks.length === 0 ? (
            <EmptyState icon={<BarChart3 size={22} />} message="Your Kanban column distribution will show up here." />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={columnDistribution} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                <XAxis dataKey="column" tick={{ fontSize: 9, fill: "#7C8AA5" }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis hide allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--tf-panel-border)", background: "var(--tf-surface)", fontSize: 12, color: "var(--tf-ink)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {columnDistribution.map((entry) => (
                    <Cell key={entry.column} fill={entry.column === "Completed" ? "#22C55E" : "#2563EB"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </GlassPanel>
      </div>

      {/* ---------- Workload, activity, deadlines ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold font-display mb-4" style={{ color: "var(--tf-ink)" }}>
            Workload distribution
          </h3>
          <div className="flex flex-col gap-3">
            {people.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>No team members yet.</p>
            ) : (
              people.map((w) => (
                <div key={w.initials}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "#C7D2E3" }}>{w.name}</span>
                    <span className="font-mono" style={{ color: "var(--tf-ink-muted)" }}>
                      {w.workloadPct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ width: `${w.workloadPct}%`, background: w.color, boxShadow: `0 0 8px ${w.color}` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <h3 className="text-sm font-semibold font-display mb-4" style={{ color: "var(--tf-ink)" }}>
            Recent activity
          </h3>
          <div className="flex flex-col gap-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>
                Nothing yet — create or complete a task to see activity here.
              </p>
            ) : (
              recentActivity.map((n) => (
                <div key={n.id} className="text-sm">
                  <span style={{ color: "var(--tf-ink)" }}>{n.message}</span>
                  <div className="text-xs font-mono mt-0.5" style={{ color: "#4B5A73" }}>
                    {timeAgo(n.when)}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="flex items-center gap-1.5 mb-4">
            <CalendarClock size={14} color="var(--tf-ink-muted)" />
            <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              Upcoming deadlines
            </h3>
          </div>
          <div className="flex flex-col gap-3">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--tf-ink-muted)" }}>Nothing with a due date coming up.</p>
            ) : (
              upcomingDeadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ color: "var(--tf-ink)" }}>
                      {d.title}
                    </div>
                    <div className="text-xs font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                      {d.due}
                    </div>
                  </div>
                  <PriorityBadge priority={d.priority} />
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
