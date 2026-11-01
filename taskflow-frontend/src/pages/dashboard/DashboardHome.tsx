import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  ListChecks,
  Activity,
  CalendarClock,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { GlassPanel, PulseCard, Eyebrow, PriorityBadge, EmptyState } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
import { NewTaskModal } from "../../components/dashboard/NewTaskModal";
import { PRIORITIES, PRIORITY_HEX } from "../../data/mockData";
import { computeInsights, computeRecommendation } from "../../lib/aiAssistant";
import { computeCompletionSeries, type TrendRange } from "../../lib/reports";
import { useTasksData, useTaskActions } from "../../context/TasksContext";
import { useTeamMembers } from "../../context/TeamContext";
import { withComputedWorkload } from "../../lib/team";
import { parseDueToAnchorDay, TODAY_DAY } from "../../lib/calendar";
import type { Priority } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { timeAgo } from "../../lib/format";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const RANGES: { key: TrendRange; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
];

const RANGE_COPY: Record<TrendRange, string> = {
  weekly: "Done vs created, week by week.",
  monthly: "Done vs created, month by month.",
  quarterly: "Done vs created, quarter by quarter.",
};

const CHART_CREATED = "#2563EB";
const CHART_DONE = "#14B8A6";

function StatCard({
  label,
  value,
  icon: Icon,
  footLeft,
  footRight,
  tone,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  footLeft: string;
  footRight: string;
  tone: string;
}) {
  return (
    <GlassPanel className="p-4 flex flex-col gap-2.5 min-h-[118px]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12.5px] leading-tight" style={{ color: "var(--tf-ink-soft)" }}>
          {label}
        </span>
        <span
          aria-hidden="true"
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{
            border: "1px solid color-mix(in srgb, var(--tf-teal) 42%, transparent)",
            background: "color-mix(in srgb, var(--tf-teal) 9%, transparent)",
            color: "var(--tf-teal)",
          }}
        >
          <Icon size={13} />
        </span>
      </div>
      <div className="font-display text-[28px] sm:text-[30px] leading-none font-semibold tracking-[-0.02em]" style={{ color: "var(--tf-ink)" }}>
        {value}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-[11px] truncate" style={{ color: "var(--tf-ink-muted)" }}>
          {footLeft}
        </span>
        <span className="text-[11px] font-mono font-medium shrink-0" style={{ color: tone }}>
          {footRight}
        </span>
      </div>
    </GlassPanel>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" />
      <span className="text-[11.5px]" style={{ color: "var(--tf-ink-muted)" }}>
        {label}
      </span>
    </span>
  );
}

/** "At risk" / "Watch" / "On track" for a single open task, from real state. */
function attentionStatus(task: { atRisk?: boolean; due: string }) {
  if (task.atRisk) return { label: "At risk", tone: "var(--tf-danger)" };
  const day = parseDueToAnchorDay(task.due);
  if (day !== null && day <= TODAY_DAY + 2) return { label: "Watch", tone: "var(--tf-warning)" };
  return { label: "On track", tone: "var(--tf-success)" };
}

export function DashboardHome() {
  const tasks = useTasksData();
  const { addTask } = useTaskActions();
  const members = useTeamMembers();
  const { user } = useAuth();
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [range, setRange] = useState<TrendRange>("weekly");

  const people = useMemo(() => withComputedWorkload(members, tasks), [members, tasks]);

  // Every number below is derived from the real, shared task list (TasksContext)
  // and real team data — create or complete a task and these update immediately.
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.column === "Completed").length;
    const open = total - completed;
    const inProgress = tasks.filter((t) => t.column === "In Progress").length;
    const atRisk = tasks.filter((t) => t.atRisk && t.column !== "Completed").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const assignedTotal = tasks.filter((t) => t.assignee).length;
    const assignedDone = tasks.filter((t) => t.assignee && t.column === "Completed").length;
    const teamEfficiency = assignedTotal > 0 ? Math.round((assignedDone / assignedTotal) * 100) : 0;

    return { total, completed, open, inProgress, atRisk, completionRate, assignedTotal, assignedDone, teamEfficiency };
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

  const series = useMemo(() => computeCompletionSeries(tasks, range), [tasks, range]);
  const hasHistory = series.some((d) => d.created > 0 || d.done > 0);

  const urgency = useMemo(
    () =>
      PRIORITIES.map((p: Priority) => ({
        name: p,
        count: tasks.filter((t) => t.column !== "Completed" && t.priority === p).length,
      })),
    [tasks]
  );

  const attention = useMemo(() => {
    return tasks
      .filter((t) => t.column !== "Completed")
      .map((task) => {
        const day = parseDueToAnchorDay(task.due);
        const person = members.find((m) => m.initials === task.assignee);
        return { task, day, person };
      })
      .sort((a, b) => {
        const risk = Number(!!b.task.atRisk) - Number(!!a.task.atRisk);
        if (risk !== 0) return risk;
        return (a.day ?? 99) - (b.day ?? 99);
      })
      .slice(0, 3);
  }, [tasks, members]);

  const recentActivity = useMemo(() => {
    // Derived from the tasks' own timestamps, so it survives a reload and
    // reflects the real history rather than this session's notification feed.
    const events = tasks.flatMap((t) => {
      const out: { id: string; message: string; when: string }[] = [];
      if (t.completedAt) out.push({ id: `${t.id}-done`, message: `Completed “${t.title}”`, when: t.completedAt });
      if (t.createdAt) out.push({ id: `${t.id}-new`, message: `Created “${t.title}”`, when: t.createdAt });
      return out;
    });
    return events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime()).slice(0, 5);
  }, [tasks]);

  return (
    <div className="flex flex-col gap-5">
      <NewTaskModal open={newTaskOpen} onClose={() => setNewTaskOpen(false)} onCreate={addTask} defaultColumn="Backlog" />

      {/* ---------- Greeting + AI tip ---------- */}
      <header>
        <h1
          className="font-display text-[26px] sm:text-[30px] font-semibold leading-tight tracking-[-0.02em]"
          style={{ color: "var(--tf-ink)" }}
        >
          {greeting()}, {user?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-soft)" }}>
          <Sparkles size={14} className="mt-0.5 shrink-0" style={{ color: "var(--tf-teal)" }} aria-hidden="true" />
          <span>
            <span className="font-semibold" style={{ color: "var(--tf-teal)" }}>
              AI tip:
            </span>{" "}
            {recommendation}
          </span>
        </p>
      </header>

      {/* ---------- Stat cards ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <StatCard
          label="Total tasks"
          value={metrics.total}
          icon={ListChecks}
          footLeft="Open right now"
          footRight={String(metrics.open)}
          tone="var(--tf-info-text)"
        />
        <StatCard
          label="Completion rate"
          value={`${metrics.completionRate}%`}
          icon={Target}
          footLeft="Tasks completed"
          footRight={`${metrics.completed}/${metrics.total}`}
          tone="var(--tf-accent-text)"
        />
        <StatCard
          label="At risk"
          value={metrics.atRisk}
          icon={AlertTriangle}
          footLeft="Flagged by AI"
          footRight={metrics.atRisk > 0 ? `${metrics.atRisk} open` : "Clear"}
          tone={metrics.atRisk > 0 ? "var(--tf-danger-text)" : "var(--tf-success-text)"}
        />
        <StatCard
          label="Team efficiency"
          value={`${metrics.teamEfficiency}%`}
          icon={Zap}
          footLeft="Assigned work done"
          footRight={`${metrics.assignedDone}/${metrics.assignedTotal}`}
          tone="var(--tf-accent-text)"
        />
      </div>

      {/* ---------- Completions chart + urgency donut ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <GlassPanel className="lg:col-span-2 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[15px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                Task completions
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                {RANGE_COPY[range]}
              </p>
            </div>
            <div
              className="flex items-center gap-0.5 p-0.5 rounded-lg"
              style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)" }}
              role="group"
              aria-label="Chart range"
            >
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  aria-pressed={range === r.key}
                  className="px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors hover:opacity-90"
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

          {hasHistory ? (
            <>
              <ResponsiveContainer width="100%" height={236}>
                <AreaChart data={series} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tf-created-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_CREATED} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_CREATED} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="tf-done-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_DONE} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={CHART_DONE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
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
                    stroke={CHART_CREATED}
                    strokeWidth={2}
                    fill="url(#tf-created-fill)"
                  />
                  <Area type="monotone" dataKey="done" name="Completed" stroke={CHART_DONE} strokeWidth={2} fill="url(#tf-done-fill)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-3 pl-1">
                <LegendDot color={CHART_CREATED} label="Created" />
                <LegendDot color={CHART_DONE} label="Completed" />
              </div>
            </>
          ) : (
            <div className="h-[236px] flex items-center justify-center">
              <EmptyState icon={<TrendingUp size={22} />} message="Create or complete a task to start building this trend." />
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="p-5 flex flex-col">
          <h2 className="text-[15px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            Tasks by urgency
          </h2>

          {metrics.open === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<Target size={22} />} message="No open tasks right now." />
            </div>
          ) : (
            <>
              <div className="relative my-2">
                <ResponsiveContainer width="100%" height={196}>
                  <PieChart>
                    <Pie
                      data={urgency}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={64}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {urgency.map((u) => (
                        <Cell key={u.name} fill={PRIORITY_HEX[u.name as Priority]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--tf-panel-border)",
                        background: "var(--tf-surface)",
                        fontSize: 12,
                        color: "var(--tf-ink)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-display text-[26px] leading-none font-semibold" style={{ color: "var(--tf-ink)" }}>
                    {metrics.open}
                  </span>
                  <span className="text-[11px] mt-1" style={{ color: "var(--tf-ink-muted)" }}>
                    open tasks
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mt-auto">
                {urgency.map((u) => (
                  <div key={u.name} className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: PRIORITY_HEX[u.name as Priority] }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-[12.5px]" style={{ color: "var(--tf-ink-soft)" }}>
                      {u.name}
                    </span>
                    <span className="text-[12.5px] font-mono font-medium" style={{ color: "var(--tf-ink)" }}>
                      {u.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassPanel>
      </div>

      {/* ---------- Needs attention ---------- */}
      <GlassPanel className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-[15px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            Needs attention
          </h2>
          <Link to="/dashboard/kanban" className="text-[12px] font-medium rounded hover:underline" style={{ color: "var(--tf-teal)" }}>
            View all tasks
          </Link>
        </div>

        {attention.length === 0 ? (
          <p className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>
            {tasks.length === 0
              ? "Nothing open yet — create a task and it'll surface here when it needs a look."
              : "Nothing open right now. Everything's wrapped up."}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {attention.map(({ task, person }) => {
              const status = attentionStatus(task);
              return (
                <div
                  key={task.id}
                  className="rounded-xl p-3.5 flex items-start justify-between gap-3"
                  style={{
                    background: `color-mix(in srgb, ${status.tone} 9%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${status.tone} 34%, transparent)`,
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold truncate" style={{ color: "var(--tf-ink)" }}>
                      {task.title}
                    </div>
                    <div className="text-[11.5px] mt-1 truncate" style={{ color: "var(--tf-ink-muted)" }}>
                      {person?.jobTitle ?? task.project ?? "Unassigned"} · Due {task.due}
                    </div>
                  </div>
                  <span className="text-[11.5px] font-semibold shrink-0" style={{ color: status.tone }}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </GlassPanel>

      {/* ---------- Secondary: insights, workload, activity, deadlines ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <PulseCard className="p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={14} style={{ color: "var(--tf-teal)" }} aria-hidden="true" />
            <h2 className="text-[13px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              AI insights
            </h2>
          </div>
          <Eyebrow color="var(--tf-primary)">Computed from current tasks</Eyebrow>
          <div className="flex flex-col gap-2 mt-2">
            {insights.length === 0 ? (
              <p className="text-[12.5px] leading-snug" style={{ color: "var(--tf-ink-muted)" }}>
                {tasks.length === 0
                  ? "Insights will appear once you've created some tasks."
                  : "Nothing stands out right now — no risk or imbalance detected."}
              </p>
            ) : (
              insights.map((line, i) => (
                <div
                  key={i}
                  className="text-[12.5px] leading-snug pl-2.5 border-l-2"
                  style={{ color: "var(--tf-ink-soft)", borderColor: "var(--tf-teal)" }}
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </PulseCard>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Users size={14} style={{ color: "var(--tf-ink-muted)" }} aria-hidden="true" />
            <h2 className="text-[13px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              Workload
            </h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {people.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: "var(--tf-ink-muted)" }}>
                No team members yet.
              </p>
            ) : (
              people.map((w) => (
                <div key={w.initials}>
                  <div className="flex justify-between text-[11.5px] mb-1">
                    <span className="truncate" style={{ color: "var(--tf-ink-soft)" }}>
                      {w.name}
                    </span>
                    <span className="font-mono shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
                      {w.workloadPct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tf-fill-08)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${w.workloadPct}%`, background: w.color, boxShadow: `0 0 8px ${w.color}` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Activity size={14} style={{ color: "var(--tf-ink-muted)" }} aria-hidden="true" />
            <h2 className="text-[13px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              Recent activity
            </h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {recentActivity.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: "var(--tf-ink-muted)" }}>
                Nothing yet — create or complete a task to see activity here.
              </p>
            ) : (
              recentActivity.map((n) => (
                <div key={n.id}>
                  <div className="text-[12.5px] leading-snug" style={{ color: "var(--tf-ink)" }}>
                    {n.message}
                  </div>
                  <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                    {timeAgo(n.when)}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <CalendarClock size={14} style={{ color: "var(--tf-ink-muted)" }} aria-hidden="true" />
            <h2 className="text-[13px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
              Upcoming deadlines
            </h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: "var(--tf-ink-muted)" }}>
                Nothing with a due date coming up.
              </p>
            ) : (
              upcomingDeadlines.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12.5px] truncate" style={{ color: "var(--tf-ink)" }}>
                      {d.title}
                    </div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
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

      {tasks.length === 0 && (
        <div className="flex justify-center pb-2">
          <Button variant="primary" size="sm" icon={<Sparkles size={13} />} onClick={() => setNewTaskOpen(true)}>
            Create your first task
          </Button>
        </div>
      )}
    </div>
  );
}
