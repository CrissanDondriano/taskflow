import { useState } from "react";
import { Slack, Check, AlertTriangle, ShieldAlert, Camera } from "lucide-react";
import { GlassPanel, Avatar, Modal } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTeamStore } from "../../stores/teamStore";
import { api, ApiError } from "../../lib/api";
import { initialsOf } from "../../lib/format";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="relative shrink-0 rounded-full transition-colors"
      style={{
        width: 40,
        height: 24,
        background: checked ? "var(--tf-primary)" : "var(--tf-fill-12)",
        boxShadow: checked ? "none" : "inset 0 0 0 1px var(--tf-panel-border)",
      }}
    >
      <span
        className="absolute rounded-full bg-white shadow-sm transition-all duration-150"
        style={{ width: 18, height: 18, top: 3, left: checked ? 19 : 3 }}
      />
    </button>
  );
}

/** The browser's own timezone — the profile has no timezone field on the API,
 * so this is shown read-only rather than pretending to be editable. */
function detectedTimezone(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = -new Date().getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "-";
    const abs = Math.abs(offset);
    const hours = Math.floor(abs / 60);
    const minutes = abs % 60;
    const gmt = `GMT${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
    return `${zone} (${gmt})`;
  } catch {
    return "Detected from your browser";
  }
}

export function SettingsPage() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { toast } = useToast();
  const team = useTeamStore((s) => s.team);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [slackStatus, setSlackStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [slackError, setSlackError] = useState<string | null>(null);

  const timezone = detectedTimezone();
  const fieldStyle = { background: "var(--tf-fill-04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" };
  const readOnlyStyle = { background: "var(--tf-fill-02)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" };
  const labelStyle = { color: "var(--tf-ink-muted)" };

  const dirty = name !== (user?.name ?? "") || email !== (user?.email ?? "");

  function resetProfile() {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(name.trim(), email.trim());
      toast("Profile updated.", "success");
    } catch (err) {
      // 422s (e.g. email already taken) surface the server's field message.
      toast(err instanceof ApiError ? err.message : "Couldn't save your profile.", "error");
    } finally {
      setSaving(false);
    }
  }

  function closeDeleteModal() {
    setDeleteOpen(false);
    setDeletePassword("");
    setDeleteError(null);
  }

  async function confirmDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(deletePassword);
      closeDeleteModal();
      toast("Your account has been deleted.", "success");
      // ProtectedRoute redirects to the login page once `user` becomes null.
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete your account.");
    } finally {
      setDeleting(false);
    }
  }

  async function connectSlack(e: React.FormEvent) {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    if (!team) {
      setSlackStatus("error");
      setSlackError("You don't have a team yet — add a member from the Team page first.");
      return;
    }
    setSlackStatus("connecting");
    setSlackError(null);
    try {
      await api.post(`/teams/${team.id}/integrations/slack`, { webhook_url: webhookUrl.trim() });
      setSlackStatus("connected");
      toast("Slack connected — check your channel for a test message.", "success");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't connect to Slack.";
      setSlackStatus("error");
      setSlackError(message);
      toast(message, "error");
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Main column */}
      <div className="flex flex-col gap-5 lg:col-span-2">
        <GlassPanel className="p-6">
          <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            Profile
          </h2>

          <div className="flex items-center gap-4 mt-5">
            <Avatar initials={initialsOf(name)} color="#2563EB" size={64} />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold truncate" style={{ color: "var(--tf-ink)" }}>
                {name || "Your name"}
              </div>
              <div className="text-[12.5px] capitalize" style={{ color: "var(--tf-ink-muted)" }}>
                {user?.role}
              </div>
            </div>
            <span
              className="ml-auto flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-lg shrink-0"
              style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}
              title="Profile photos aren't supported yet — your initials are used across the app."
            >
              <Camera size={12} aria-hidden="true" /> Initials avatar
            </span>
          </div>

          <form onSubmit={saveProfile} className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="settings-name" className="text-[11px] font-mono block mb-1" style={labelStyle}>
                  Full name
                </label>
                <input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label htmlFor="settings-email" className="text-[11px] font-mono block mb-1" style={labelStyle}>
                  Email
                </label>
                <input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label htmlFor="settings-timezone" className="text-[11px] font-mono block mb-1" style={labelStyle}>
                  Timezone
                </label>
                <input
                  id="settings-timezone"
                  value={timezone}
                  readOnly
                  aria-describedby="settings-timezone-note"
                  className="w-full text-sm px-3 py-2.5 rounded-xl outline-none"
                  style={readOnlyStyle}
                />
                <p id="settings-timezone-note" className="text-[11px] mt-1" style={{ color: "var(--tf-ink-muted)" }}>
                  Detected from this browser.
                </p>
              </div>
              <div>
                <label htmlFor="settings-role" className="text-[11px] font-mono block mb-1" style={labelStyle}>
                  Role
                </label>
                <input
                  id="settings-role"
                  value={user?.role ?? ""}
                  readOnly
                  className="w-full text-sm px-3 py-2.5 rounded-xl outline-none capitalize"
                  style={readOnlyStyle}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--tf-ink-muted)" }}>
                  Set by your team owner.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
                Save changes
              </Button>
              <Button type="button" variant="ghost" onClick={resetProfile} disabled={!dirty || saving}>
                Cancel
              </Button>
            </div>
          </form>
        </GlassPanel>

        <GlassPanel className="p-6">
          <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
            Notifications
          </h2>
          <div className="flex flex-col mt-2">
            {[
              { label: "Email notifications", desc: "Deadline reminders and weekly summaries", value: emailNotifs, set: setEmailNotifs },
              { label: "Slack notifications", desc: "Task assignments and completions", value: slackNotifs, set: setSlackNotifs },
              { label: "AI risk alerts", desc: "When the AI flags a task or project as at risk", value: riskAlerts, set: setRiskAlerts },
              { label: "Weekly digest", desc: "A Monday-morning productivity summary", value: weeklyDigest, set: setWeeklyDigest },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 py-3.5"
                style={{ borderTop: "1px solid var(--tf-panel-border)" }}
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-medium" style={{ color: "var(--tf-ink)" }}>
                    {row.label}
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "var(--tf-ink-muted)" }}>
                    {row.desc}
                  </div>
                </div>
                <Toggle checked={row.value} onChange={row.set} label={row.label} />
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* Side column */}
      <div className="flex flex-col gap-5">
        <GlassPanel className="p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Slack size={16} color="var(--tf-teal)" aria-hidden="true" />
              <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                Slack integration
              </h2>
            </div>
            <span
              className="text-[10.5px] px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: slackStatus === "connected" ? "rgba(34,197,94,0.12)" : "var(--tf-fill-06)",
                color: slackStatus === "connected" ? "var(--tf-success-text)" : "var(--tf-ink-muted)",
              }}
            >
              {slackStatus === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>
          <p className="text-[12.5px] mt-2 leading-snug" style={{ color: "var(--tf-ink-muted)" }}>
            Paste an Incoming Webhook URL from Slack to get task and risk alerts in a channel.
          </p>
          <form onSubmit={connectSlack} className="flex flex-col gap-2 mt-4">
            <label htmlFor="slack-webhook" className="text-[11px] font-mono" style={labelStyle}>
              Webhook URL
            </label>
            <input
              id="slack-webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              aria-label="Slack incoming webhook URL"
              aria-invalid={slackStatus === "error"}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full text-[13px] px-3 py-2.5 rounded-xl outline-none"
              style={fieldStyle}
            />
            <Button type="submit" variant="teal" loading={slackStatus === "connecting"} className="mt-1">
              {slackStatus === "connecting" ? "Connecting..." : "Connect"}
            </Button>
          </form>
          {slackStatus === "connected" && (
            <p className="text-[12px] mt-3 flex items-start gap-1.5" style={{ color: "var(--tf-teal)" }}>
              <Check size={13} className="mt-0.5 shrink-0" /> Slack connected — check your channel for a test message.
            </p>
          )}
          {slackStatus === "error" && (
            <p role="alert" className="text-[12px] mt-3 flex items-start gap-1.5" style={{ color: "var(--tf-danger-text)" }}>
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {slackError}
            </p>
          )}
        </GlassPanel>

        <GlassPanel className="p-6" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} color="var(--tf-danger)" aria-hidden="true" />
            <h2 className="text-[16px] font-semibold font-display" style={{ color: "var(--tf-danger)" }}>
              Danger zone
            </h2>
          </div>
          <p className="text-[12.5px] mt-2 leading-snug" style={{ color: "var(--tf-ink-muted)" }}>
            Permanently delete your account. Teams you own with other members are handed to them first (their projects
            and tasks stay intact); anything that is only yours is removed. This can&apos;t be undone.
          </p>
          <Button variant="danger" className="mt-4" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
          <Modal open={deleteOpen} onClose={closeDeleteModal} title="Delete account?">
            <form onSubmit={confirmDelete} className="flex flex-col gap-3">
              <p className="text-xs" style={{ color: "var(--tf-ink-muted)" }}>
                Enter your password to confirm. This signs you out everywhere and permanently removes your account — it can&apos;t be undone.
              </p>
              <div>
                <label htmlFor="delete-password" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
                  Current password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                  style={fieldStyle}
                />
              </div>
              {deleteError && (
                <p role="alert" className="text-xs" style={{ color: "var(--tf-danger-text)" }}>
                  {deleteError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeDeleteModal}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" loading={deleting} disabled={!deletePassword}>
                  Delete account
                </Button>
              </div>
            </form>
          </Modal>
        </GlassPanel>
      </div>
    </div>
  );
}
