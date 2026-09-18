import { useMemo, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { GlassPanel, Modal } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
import { MemberCard } from "../../components/team/MemberCard";
import { AiWorkloadPanel } from "../../components/team/AiWorkloadPanel";
import { SharedProjectsList } from "../../components/team/SharedProjectsList";
import { SharedCalendarPreview } from "../../components/team/SharedCalendarPreview";
import { CollaborationTimeline } from "../../components/team/CollaborationTimeline";
import { TeamAchievements } from "../../components/team/TeamAchievements";
import { useTasks } from "../../context/TasksContext";
import { useMeetings } from "../../context/MeetingsContext";
import { useTeam } from "../../context/TeamContext";
import { withComputedWorkload } from "../../lib/team";

const COLORS = ["#2563EB", "#14B8A6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export function TeamPage() {
  const { members, addMember, removeMember } = useTeam();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("All");
  const { tasks } = useTasks();
  const { meetings } = useMeetings();

  const people = useMemo(() => withComputedWorkload(members, tasks), [members, tasks]);

  const departments = useMemo(() => ["All", ...Array.from(new Set(people.map((p) => p.department)))], [people]);

  const filtered = people.filter((p) => {
    const matchesSearch = `${p.name} ${p.jobTitle} ${p.department}`.toLowerCase().includes(search.toLowerCase());
    const matchesDept = department === "All" || p.department === department;
    return matchesSearch && matchesDept;
  });

  const avgWorkload = people.length > 0 ? Math.round(people.reduce((sum, p) => sum + p.workloadPct, 0) / people.length) : 0;
  const sharedProjectCount = new Set(tasks.map((t) => t.project)).size;
  const completedCount = tasks.filter((t) => t.column === "Completed").length;

  function inviteMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const jobTitle = String(form.get("jobTitle") ?? "").trim() || "Team member";
    const dept = String(form.get("department") ?? "").trim() || "Engineering";
    if (!name || !email) return;

    const initials = name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    addMember({
      initials,
      name,
      email,
      jobTitle,
      department: dept,
      status: "offline",
      role: "member",
      workloadPct: 0,
      color: COLORS[members.length % COLORS.length],
    });
    setInviteOpen(false);
    e.currentTarget.reset();
  }

  return (
    <div className="flex flex-col gap-5">
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a team member">
        <form onSubmit={inviteMember} className="flex flex-col gap-3">
          <div>
            <label htmlFor="invite-name" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
              Name *
            </label>
            <input
              id="invite-name"
              name="name"
              required
              placeholder="e.g. Priya Sharma"
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
          </div>
          <div>
            <label htmlFor="invite-email" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
              Email *
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              placeholder="priya@company.com"
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="invite-role" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
                Role / title
              </label>
              <input
                id="invite-role"
                name="jobTitle"
                placeholder="e.g. QA Engineer"
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
              />
            </div>
            <div>
              <label htmlFor="invite-department" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
                Department
              </label>
              <input
                id="invite-department"
                name="department"
                placeholder="e.g. Engineering"
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
              />
            </div>
          </div>
          <p className="text-[11px]" style={{ color: "var(--tf-ink-muted)" }}>
            This adds them to your local team view. To send a real invite email, wire this form to{" "}
            <code className="font-mono">POST /api/teams/{"{team}"}/members</code> in the backend.
          </p>
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassPanel className="p-4">
          <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
            Members
          </div>
          <div className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            {people.length}
          </div>
        </GlassPanel>
        <GlassPanel className="p-4">
          <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
            Avg workload
          </div>
          <div className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            {avgWorkload}%
          </div>
        </GlassPanel>
        <GlassPanel className="p-4">
          <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
            Shared projects
          </div>
          <div className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            {sharedProjectCount}
          </div>
        </GlassPanel>
        <GlassPanel className="p-4">
          <div className="text-[10px] font-mono uppercase tracking-wide" style={{ color: "var(--tf-ink-muted)" }}>
            Tasks completed
          </div>
          <div className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            {completedCount}
          </div>
        </GlassPanel>
      </div>

      <AiWorkloadPanel people={people} tasks={tasks} />

      {/* search + filter + invite */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-ink-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              aria-label="Search members"
              className="pl-8 pr-3 py-2 rounded-xl text-sm outline-none w-full sm:w-56"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
          </div>
          <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "rgba(255,255,255,0.03)" }}>
            {departments.map((d) => (
              <button
                key={d}
                onClick={() => setDepartment(d)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: department === d ? "var(--tf-primary)" : "transparent", color: department === d ? "white" : "var(--tf-ink-muted)" }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
          Invite member
        </Button>
      </div>

      {/* member grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <MemberCard
            key={p.initials}
            person={p}
            assignedCount={tasks.filter((t) => t.assignee === p.initials).length}
            completedCount={tasks.filter((t) => t.assignee === p.initials && t.column === "Completed").length}
            onRemove={() => removeMember(p.initials)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm col-span-full text-center py-8" style={{ color: "var(--tf-ink-muted)" }}>
            No members match "{search}"{department !== "All" ? ` in ${department}` : ""}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SharedProjectsList tasks={tasks} />
        <SharedCalendarPreview meetings={meetings} />
        <TeamAchievements tasks={tasks} />
      </div>

      <CollaborationTimeline />
    </div>
  );
}
