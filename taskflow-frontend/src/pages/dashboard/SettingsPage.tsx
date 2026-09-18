import { useState } from "react";
import { Slack, Check, AlertTriangle } from "lucide-react";
import { GlassPanel, Avatar } from "../../components/ui/Primitives";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";
import { api, ApiError } from "../../lib/api";

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
        background: checked ? "var(--tf-primary)" : "rgba(255,255,255,0.12)",
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

export function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saved, setSaved] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(true);
  const [riskAlerts, setRiskAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [slackStatus, setSlackStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [slackError, setSlackError] = useState<string | null>(null);

  const fieldStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" };
  const labelStyle = { color: "var(--tf-ink-muted)" };

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    // Wire this to PATCH /api/me (add that endpoint to AuthController) when ready.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function connectSlack(e: React.FormEvent) {
    e.preventDefault();
    if (!webhookUrl.trim()) return;
    setSlackStatus("connecting");
    setSlackError(null);
    try {
      // Requires a team ID in a real setup — this assumes team 1 for the demo seed data.
      await api.post("/teams/1/integrations/slack", { webhook_url: webhookUrl.trim() });
      setSlackStatus("connected");
    } catch (err) {
      setSlackStatus("error");
      setSlackError(err instanceof ApiError ? err.message : "Couldn't connect to Slack.");
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="flex flex-col gap-5">
          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold font-display mb-4" style={{ color: "var(--tf-ink)" }}>
              Profile
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <Avatar initials={initialsOf(name)} color="#2563EB" size={48} />
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--tf-ink)" }}>
                  {name || "Your name"}
                </div>
                <div className="text-xs capitalize" style={{ color: "var(--tf-ink-muted)" }}>
                  {user?.role}
                </div>
              </div>
            </div>
            <form onSubmit={saveProfile} className="flex flex-col gap-3">
              <div>
                <label htmlFor="settings-name" className="text-[11px] font-mono block mb-1" style={labelStyle}>
                  Full name
                </label>
                <input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full text-sm px-3 py-2 rounded-xl outline-none" style={fieldStyle} />
              </div>
              <div>
                <label htmlFor="settings-email" className="text-[11px] font-mono block mb-1" style={labelStyle}>
                  Email
                </label>
                <input id="settings-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full text-sm px-3 py-2 rounded-xl outline-none" style={fieldStyle} />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <Button type="submit" variant="primary">
                  Save changes
                </Button>
                {saved && (
                  <span className="text-xs flex items-center gap-1" style={{ color: "var(--tf-teal)" }}>
                    <Check size={13} /> Saved
                  </span>
                )}
              </div>
            </form>
          </GlassPanel>

          <GlassPanel className="p-5">
            <h3 className="text-sm font-semibold font-display mb-4" style={{ color: "var(--tf-ink)" }}>
              Notifications
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "Email notifications", desc: "Deadline reminders and weekly summaries", value: emailNotifs, set: setEmailNotifs },
                { label: "Slack notifications", desc: "Task assignments and completions", value: slackNotifs, set: setSlackNotifs },
                { label: "AI risk alerts", desc: "When the AI flags a task or project as at risk", value: riskAlerts, set: setRiskAlerts },
                { label: "Weekly digest", desc: "A Monday-morning productivity summary", value: weeklyDigest, set: setWeeklyDigest },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--tf-panel-border)" }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--tf-ink)" }}>
                      {row.label}
                    </div>
                    <div className="text-xs" style={{ color: "var(--tf-ink-muted)" }}>
                      {row.desc}
                    </div>
                  </div>
                  <Toggle checked={row.value} onChange={row.set} label={row.label} />
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <div className="flex flex-col gap-5">
          <GlassPanel className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Slack size={16} color="#14B8A6" />
              <h3 className="text-sm font-semibold font-display" style={{ color: "var(--tf-ink)" }}>
                Slack integration
              </h3>
            </div>
            <p className="text-xs mb-3" style={{ color: "var(--tf-ink-muted)" }}>
              Paste an Incoming Webhook URL from Slack to get task and risk alerts in a channel.
            </p>
            <form onSubmit={connectSlack} className="flex flex-col sm:flex-row gap-2">
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl outline-none"
                style={fieldStyle}
              />
              <Button type="submit" variant="teal" loading={slackStatus === "connecting"} className="shrink-0">
                {slackStatus === "connecting" ? "Connecting..." : "Connect"}
              </Button>
            </form>
            {slackStatus === "connected" && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--tf-teal)" }}>
                <Check size={13} /> Slack connected — check your channel for a test message.
              </p>
            )}
            {slackStatus === "error" && (
              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--tf-danger)" }}>
                <AlertTriangle size={13} /> {slackError}
              </p>
            )}
          </GlassPanel>

          <GlassPanel className="p-5" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
            <h3 className="text-sm font-semibold font-display mb-1" style={{ color: "var(--tf-danger)" }}>
              Danger zone
            </h3>
            <p className="text-xs mb-3" style={{ color: "var(--tf-ink-muted)" }}>
              Permanently delete your account and all associated data. This can't be undone.
            </p>
            <Button
              variant="danger"
              onClick={() => alert("This is a demo — wire this up to a real DELETE /api/me endpoint before using it for real.")}
            >
              Delete account
            </Button>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

function initialsOf(name: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}
