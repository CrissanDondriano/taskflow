import { useMemo, useState, useDeferredValue } from "react";
import { Search, UserPlus } from "lucide-react";
import { GlassPanel, Modal, EmptyState, ConfirmDialog } from "../../components/ui/Primitives";
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
  // One confirm for the whole grid instead of a hidden Modal tree per card.
  const [removeTarget, setRemoveTarget] = useState<Person | null>(null);
  // Defer the filtered-list computation so typing stays responsive.
  const deferredSearch = useDeferredValue(search);
  const tasks = useTasksData();
  const meetings = useMeetingsData();

  const people = useMemo(() => withComputedWorkload(members, tasks), [members, tasks]);

  const departments = useMemo(() => ["All", ...Array.from(new Set(people.map((p) => p.department)))], [people]);

  const filtered = people.filter((p) => {
    const matchesSearch = `${p.name} ${p.jobTitle} ${p.department}`.toLowerCase().includes(deferredSearch.toLowerCase());
    const matchesDept = department === "All" || p.department === department;
    return matchesSearch && matchesDept;
  });

  const avgWorkload = people.length > 0 ? Math.round(people.reduce((sum, p) => sum + p.workloadPct, 0) / people.length) : 0;
  const sharedProjectCount = new Set(tasks.map((t) => t.project)).size;
  const completedCount = tasks.filter((t) => t.column === "Completed").length;

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
        toast(err instanceof ApiError ? err.message : "Member limit reached.", "error", {
          label: "View plans",
          run: () => (window.location.href = "/dashboard/billing"),
        });
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

  return (
    <div className="flex flex-col gap-5">
      <Modal open={inviteOpen} onClose={closeInvite} title="Invite a team member">
        <form onSubmit={inviteMember} className="flex flex-col gap-3">
          <div>
            <label htmlFor="invite-email" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
              Email *
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              autoFocus
              placeholder="priya@company.com"
              className="w-full text-sm px-3 py-2 rounded-xl outline-none"
              style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
          </div>
          <p className="text-[11px]" style={{ color: "var(--tf-ink-muted)" }}>
            Adds an existing TaskFlow account to your team. No invite email is sent — if they haven't signed up yet,
            they'll need to register first. Your team is created automatically if you don't have one yet.
          </p>
          {inviteError && (
            <p className="text-[11px]" style={{ color: "var(--tf-danger)" }}>
              {inviteError}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="secondary" onClick={closeInvite}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={inviting}>
              Add member
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
              style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
            />
          </div>
          <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: "var(--tf-fill-03)" }}>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 300px" }}>
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
        {filtered.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={<Search size={22} />}
              message={
                search || department !== "All"
                  ? `No members match "${search}"${department !== "All" ? ` in ${department}` : ""}.`
                  : "Nobody here yet — invite your first teammate."
              }
              action={
                search || department !== "All" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setDepartment("All");
                    }}
                  >
                    Clear search and filters
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
                    Invite a member
                  </Button>
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

      <CollaborationTimeline />
    </div>
  );
}
