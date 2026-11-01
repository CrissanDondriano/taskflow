import { useMemo, useState, useDeferredValue, useEffect } from "react";
import { Search, UserPlus } from "lucide-react";
import { GlassPanel, Modal, EmptyState, ConfirmDialog } from "../../components/ui/Primitives";
import { Skeleton } from "../../components/ui/Skeleton";
import type { Person } from "../../types";
import { Button } from "../../components/ui/Button";
import { MemberCard } from "../../components/team/MemberCard";
import { AiWorkloadPanel } from "../../components/team/AiWorkloadPanel";
import { SharedProjectsList } from "../../components/team/SharedProjectsList";
import { SharedCalendarPreview } from "../../components/team/SharedCalendarPreview";
import { CollaborationTimeline } from "../../components/team/CollaborationTimeline";
import { TeamAchievements } from "../../components/team/TeamAchievements";
import { useTasksData } from "../../context/TasksContext";
import { useMeetingsData } from "../../context/MeetingsContext";
import { useTeamMembers, useTeamActions, useCanManageTeam } from "../../context/TeamContext";
import { useToast } from "../../context/ToastContext";
import { isUpgradeRequired } from "../../lib/billing";
import { withComputedWorkload } from "../../lib/team";
import { ApiError } from "../../lib/api";

export function TeamPage() {
  const members = useTeamMembers();
  const { inviteByEmail, setMemberTitle, removeMember, undoDelete } = useTeamActions();
  const canManage = useCanManageTeam();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<Person | null>(null);
  const deferredSearch = useDeferredValue(search);
  const tasks = useTasksData();
  const meetings = useMeetingsData();

  const people = useMemo(() => withComputedWorkload(members, tasks), [members, tasks]);

  const departments = useMemo(() => ["All", ...Array.from(new Set(people.map((p) => p.department)))], [people]);

  useEffect(() => { setLoading(false); }, []);

  const filtered = people.filter((p) => {
    const matchesSearch = `${p.name} ${p.jobTitle} ${p.department}`.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchesDept = department === "All" || p.department === department;
    return matchesSearch && matchesDept;
  });

  const avgWorkload = people.length > 0 ? Math.round(people.reduce((sum, p) => sum + p.workloadPct, 0) / people.length) : 0;
  const sharedProjectCount = new Set(tasks.map((t) => t.project)).size;
  const completedCount = tasks.filter((t) => t.column === "Completed").length;
  const onlineCount = people.filter((p) => p.status === "online").length;

  // Real delta for tasks completed in the last 30 days vs the previous 30.
  const now = Date.now();
  const thirty = 30 * 86400000;
  const recentCompleted = tasks.filter((t) => t.column === "Completed" && t.completedAt && new Date(t.completedAt).getTime() > now - thirty).length;
  const priorCompleted = tasks.filter((t) => t.column === "Completed" && t.completedAt && new Date(t.completedAt).getTime() <= now - thirty && new Date(t.completedAt).getTime() > now - 2 * thirty).length;
  const completedDelta = recentCompleted - priorCompleted;

  async function inviteMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!email) return;
    setInviting(true);
    setInviteError(null);
    try {
      await inviteByEmail(email);
      setInviteOpen(false);
      e.currentTarget.reset();
      toast(`${email} was added to your team.`, "success");
    } catch (err) {
      if (isUpgradeRequired(err)) {
        setInviteOpen(false);
        toast(err instanceof ApiError ? err.message : "Member limit reached.", "error", { label: "View plans", run: () => (window.location.href = "/dashboard/billing") });
      } else if (err instanceof ApiError && err.status === 422) {
        setInviteError("No TaskFlow account uses that email — ask them to sign up first, then invite them again.");
      } else if (err instanceof ApiError && err.status === 403) {
        setInviteError("Only the team owner can add members.");
      } else {
        setInviteError(err instanceof ApiError ? err.message : "Couldn't add the member.");
      }
    } finally {
      setInviting(false);
    }
  }

  function closeInvite() {
    setInviteOpen(false);
    setInviteError(null);
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Skeleton variant="rect" width={48} height={48} className="rounded-2xl" />
          <Skeleton variant="rect" width={60} height={20} />
          <Skeleton variant="text" width="30%" height={13} />
          <Skeleton variant="text" width="50%" height={13} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Modal open={inviteOpen} onClose={closeInvite} title="Invite a team member">
        <form onSubmit={inviteMember} className="flex flex-col gap-3">
          <div>
            <label htmlFor="invite-email" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>Email *</label>
            <input id="invite-email" name="email" type="email" required autoFocus placeholder="priya@company.com" className="w-full text-sm px-3 py-2 rounded-xl outline-none" style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }} />
          </div>
          <p className="text-[11px]" style={{ color: "var(--tf-ink-muted)" }}>
            Adds an existing TaskFlow account to your team. No invite email is sent — if they haven&apos;t signed up yet, they&apos;ll need to register first.
          </p>
          {inviteError && <p className="text-[11px]" style={{ color: "var(--tf-danger-text)" }}>{inviteError}</p>}
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="secondary" onClick={closeInvite}>Cancel</Button>
            <Button type="submit" variant="primary" loading={inviting}>Add member</Button>
          </div>
        </form>
      </Modal>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassPanel className="p-5">
          <div className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>Members</div>
          <div className="text-[30px] font-display font-semibold leading-none mt-2" style={{ color: "var(--tf-ink)" }}>{people.length}</div>
          <div className="flex items-center justify-between mt-4 text-[12px]">
            <span style={{ color: "var(--tf-ink-muted)" }}>On this team</span>
            <span style={{ color: "var(--tf-success)" }}>{onlineCount} active now</span>
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <div className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>Avg workload</div>
          <div className="text-[30px] font-display font-semibold leading-none mt-2" style={{ color: "var(--tf-ink)" }}>{avgWorkload}%</div>
          <div className="flex items-center justify-between mt-4 text-[12px]">
            <span style={{ color: "var(--tf-ink-muted)" }}>Across the team</span>
            <span style={{ color: "var(--tf-ink-muted)" }}>{Math.max(...people.map((p) => p.workloadPct), 0)}% peak</span>
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <div className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>Shared projects</div>
          <div className="text-[30px] font-display font-semibold leading-none mt-2" style={{ color: "var(--tf-ink)" }}>{sharedProjectCount}</div>
          <div className="flex items-center justify-between mt-4 text-[12px]">
            <span style={{ color: "var(--tf-ink-muted)" }}>Active now</span>
            <span style={{ color: "var(--tf-ink-muted)" }}>{tasks.filter((t) => t.column !== "Completed").length} open tasks</span>
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <div className="text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>Tasks completed</div>
          <div className="text-[30px] font-display font-semibold leading-none mt-2" style={{ color: "var(--tf-ink)" }}>{completedCount}</div>
          <div className="flex items-center justify-between mt-4 text-[12px]">
            <span style={{ color: "var(--tf-ink-muted)" }}>Last 30 days</span>
            <span style={{ color: completedDelta >= 0 ? "var(--tf-success)" : "var(--tf-danger)" }}>
              {completedDelta >= 0 ? "↑" : "↓"} {completedDelta >= 0 ? "+" : ""}{completedDelta}
            </span>
          </div>
        </GlassPanel>
      </div>

      <AiWorkloadPanel people={people} tasks={tasks} />

      {/* Search + filter + invite */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-ink-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              aria-label="Search members"
              className="pl-8 pr-3 py-2 rounded-xl text-sm outline-none w-full sm:w-80"
              style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
          </div>
          <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "var(--tf-fill-03)" }}>
            {departments.map((d) => {
              const count = d === "All" ? people.length : people.filter((p) => p.department === d).length;
              return (
                <button
                  key={d}
                  onClick={() => setDepartment(d)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors flex items-center gap-1.5"
                  style={{ background: department === d ? "var(--tf-fill-12)" : "transparent", color: department === d ? "var(--tf-ink)" : "var(--tf-ink-muted)" }}
                >
                  {d} <span style={{ color: department === d ? "var(--tf-ink-muted)" : "var(--tf-ink-muted)", opacity: 0.8, fontSize: 11 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => setInviteOpen(true)}>
          Invite member
        </Button>
      </div>

      {/* Member grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <MemberCard
            key={p.initials}
            person={p}
            assignedCount={tasks.filter((t) => t.assignee === p.initials).length}
            completedCount={tasks.filter((t) => t.assignee === p.initials && t.column === "Completed").length}
            onRemove={setRemoveTarget}
            canManage={canManage}
            onSaveTitle={(initials, title) => setMemberTitle(initials, title)}
          />
        ))}
        <button
          onClick={() => setInviteOpen(true)}
          className="rounded-2xl flex flex-col items-center justify-center gap-2 p-4 min-h-[160px] transition-colors hover:bg-white/5"
          style={{ border: "1px dashed var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
        >
          <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--tf-fill-04)" }}>
            <UserPlus size={16} />
          </span>
          <span className="text-[13px]">Invite a teammate</span>
        </button>
        {filtered.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={<Search size={22} />}
              message={search || department !== "All" ? `No members match "${search}"${department !== "All" ? ` in ${department}` : ""}.` : "Nobody here yet — invite your first teammate."}
              action={
                search || department !== "All" ? (
                  <Button variant="secondary" size="sm" onClick={() => { setSearch(""); setDepartment("All"); }}>Clear search and filters</Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>Invite a member</Button>
                )
              }
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="Remove from team?"
        message={removeTarget ? `${removeTarget.name} will be removed from the team. You'll get a short window to undo this from the notification.` : ""}
        confirmLabel="Remove"
        onConfirm={() => {
          if (removeTarget) {
            removeMember(removeTarget.initials);
            toast("Member removed.", "info", { label: "Undo", run: undoDelete });
          }
          setRemoveTarget(null);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SharedProjectsList tasks={tasks} />
        <SharedCalendarPreview meetings={meetings} />
        <TeamAchievements tasks={tasks} />
      </div>

      <CollaborationTimeline tasks={tasks} />
    </div>
  );
}
