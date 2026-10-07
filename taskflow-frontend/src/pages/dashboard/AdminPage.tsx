import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, ScrollText, Users } from "lucide-react";
import { GlassPanel, EmptyState, Avatar } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
import { Skeleton, SkeletonStatCard } from "../../components/ui/Skeleton";
import { useAdminStore } from "../../stores/adminStore";
import { useToast } from "../../context/ToastContext";
import { initialsOf } from "../../lib/format";
import type { AuthUser } from "../../types";

const ROLE_OPTIONS: AuthUser["role"][] = ["admin", "manager", "member"];

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function AdminPage() {
  const { stats, users, logs, loading, error, fetchAll, setRole } = useAdminStore();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function changeRole(userId: number, name: string, role: AuthUser["role"]) {
    setUpdatingId(userId);
    const ok = await setRole(userId, role);
    setUpdatingId(null);
    if (ok) {
      toast(`${name} is now ${role}.`, "success");
    } else {
      toast(useAdminStore.getState().error ?? "Could not change the role.", "error");
    }
  }

  const statCards = stats
    ? [
        { label: "Users", value: stats.users },
        { label: "Teams", value: stats.teams },
        { label: "Projects", value: stats.projects },
        { label: "Tasks", value: stats.tasks },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            Admin
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
            Platform overview, user roles and the audit trail.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={() => void fetchAll()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error && !loading && (
        <div
          role="alert"
          className="text-[12px] px-4 py-3 rounded-xl"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--tf-danger-text)" }}
        >
          {error}
        </div>
      )}

      {/* Platform stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading && !stats
          ? [0, 1, 2, 3].map((i) => <SkeletonStatCard key={i} />)
          : statCards.map((s) => (
              <GlassPanel key={s.label} className="p-4">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] mb-2" style={{ color: "var(--tf-ink-muted)" }}>
                  {s.label}
                </div>
                <div className="text-xl font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
                  {s.value}
                </div>
              </GlassPanel>
            ))}
      </div>

      {/* AI + audit status strip */}
      {stats && (
        <GlassPanel className="px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="flex items-center gap-2 text-[12px]" style={{ color: "var(--tf-ink)" }}>
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: stats.ai.configured ? "var(--tf-success)" : "var(--tf-warning)",
                boxShadow: stats.ai.configured ? "0 0 6px var(--tf-success)" : "none",
              }}
            />
            {stats.ai.configured ? `AI configured (${stats.ai.model})` : "AI not configured — set OPENAI_API_KEY"}
          </span>
          <span className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
            {stats.ai.insights} AI insights recorded
          </span>
          <span className="text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
            {stats.audit_events} audit events
          </span>
        </GlassPanel>
      )}

      {/* User directory */}
      <GlassPanel className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={15} style={{ color: "var(--tf-teal)" }} />
          <h2 className="text-[15px] font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            Users
          </h2>
        </div>

        {loading && users.length === 0 ? (
          <div className="flex flex-col gap-3">
            <Skeleton variant="rect" height={36} />
            <Skeleton variant="rect" height={36} />
            <Skeleton variant="rect" height={36} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={<Users size={20} />} message="No users found." />
        ) : (
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left" style={{ color: "var(--tf-ink-muted)" }}>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 pr-4 font-normal">User</th>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 pr-4 font-normal">Role</th>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 pr-4 font-normal">Assigned</th>
                  <th className="font-mono text-[10px] uppercase tracking-wider pb-2 font-normal">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar initials={initialsOf(u.name)} color="#2563EB" size={28} />
                        <div className="min-w-0">
                          <div className="font-medium truncate" style={{ color: "var(--tf-ink)" }}>
                            {u.name}
                          </div>
                          <div className="text-[11px] truncate" style={{ color: "var(--tf-ink-muted)" }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <select
                        aria-label={`Role for ${u.name}`}
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => void changeRole(u.id, u.name, e.target.value as AuthUser["role"])}
                        className="text-[12px] px-2 py-1.5 rounded-lg outline-none cursor-pointer disabled:opacity-50"
                        style={{ background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 pr-4" style={{ color: "var(--tf-ink-muted)" }}>
                      {u.assigned_tasks_count}
                    </td>
                    <td className="py-2.5" style={{ color: "var(--tf-ink-muted)" }}>
                      {formatWhen(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>

      {/* Audit trail */}
      <GlassPanel className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText size={15} style={{ color: "var(--tf-teal)" }} />
          <h2 className="text-[15px] font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            Audit trail
          </h2>
        </div>

        {loading && logs.length === 0 ? (
          <div className="flex flex-col gap-3">
            <Skeleton variant="rect" height={32} />
            <Skeleton variant="rect" height={32} />
            <Skeleton variant="rect" height={32} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState icon={<ShieldCheck size={20} />} message="No audit events yet — logins and role changes will show up here." />
        ) : (
          <ul className="flex flex-col">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-[12px]"
                style={{ borderTop: "1px solid var(--tf-panel-border)" }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <code className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: "var(--tf-fill-04)", color: "var(--tf-ink)" }}>
                    {log.action}
                  </code>
                  <span className="truncate" style={{ color: "var(--tf-ink-muted)" }}>
                    {log.user ? `${log.user.name} (${log.user.email})` : "System"}
                  </span>
                </span>
                <span className="flex items-center gap-3 shrink-0" style={{ color: "var(--tf-ink-muted)" }}>
                  {log.ip_address && <span className="font-mono text-[11px]">{log.ip_address}</span>}
                  <span>{formatWhen(log.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
