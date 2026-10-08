import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Lock, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { GlassPanel, TextField } from "../components/ui/Primitives";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";

export function ResetPasswordPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  usePageMeta("Reset password", "Choose a new password for your TaskFlow AI account.");

  if (user) return <Navigate to="/dashboard" replace />;

  const hasLink = Boolean(token && email);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const errs: { password?: string; confirm?: string } = {};
    if (!password) errs.password = "Enter a new password.";
    else if (password.length < 8) errs.password = "Use at least 8 characters.";
    if (!confirm) errs.confirm = "Repeat the new password.";
    else if (confirm !== password) errs.confirm = "Passwords don't match.";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      await api.post("/reset-password", { token, email, password, password_confirmation: confirm });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4" style={{ background: "var(--tf-void)" }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(700px circle at 20% 20%, rgba(37,99,235,0.16), transparent 60%), radial-gradient(600px circle at 80% 80%, rgba(20,184,166,0.12), transparent 60%)",
          opacity: "var(--tf-aurora-opacity)",
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563EB, #14B8A6)", boxShadow: "0 0 18px rgba(20,184,166,0.4)" }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <span className="text-[19px] font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            TaskFlow <span style={{ color: "var(--tf-teal)" }}>AI</span>
          </span>
        </Link>

        <GlassPanel className="p-6 sm:p-8">
          {!hasLink ? (
            <div>
              <h1 className="text-[20px] font-display font-semibold mb-1" style={{ color: "var(--tf-ink)" }}>
                Invalid reset link
              </h1>
              <p className="text-[13px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
                This link is incomplete or malformed. Request a fresh one and open it from your inbox.
              </p>
              <Button variant="primary" fullWidth onClick={() => navigate("/forgot-password")}>
                Request a new link
              </Button>
            </div>
          ) : done ? (
            <div>
              <div className="flex items-center gap-2 mb-2" style={{ color: "var(--tf-success)" }}>
                <CheckCircle2 size={18} />
                <h1 className="text-[20px] font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
                  Password updated
                </h1>
              </div>
              <p className="text-[13px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
                Your password has been changed. Log in with your new credentials.
              </p>
              <Button variant="primary" fullWidth onClick={() => navigate("/login")}>
                Go to log in
              </Button>
            </div>
          ) : (
            <div>
              <h1 className="text-[20px] font-display font-semibold mb-1" style={{ color: "var(--tf-ink)" }}>
                Set a new password
              </h1>
              <p className="text-[13px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
                Choose a password of at least 8 characters for <span style={{ color: "var(--tf-ink)" }}>{email}</span>.
              </p>

              {error && (
                <div role="alert" className="flex items-start gap-2 text-[12px] p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.1)", color: "var(--tf-danger-text)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                <TextField
                  id="reset-password"
                  label="New password"
                  type="password"
                  required
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    setError(null);
                  }}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  icon={<Lock size={14} />}
                  error={fieldErrors.password}
                />

                <TextField
                  id="reset-confirm"
                  label="Confirm new password"
                  type="password"
                  required
                  value={confirm}
                  onChange={(v) => {
                    setConfirm(v);
                    setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                    setError(null);
                  }}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  icon={<Lock size={14} />}
                  error={fieldErrors.confirm}
                />

                <Button type="submit" variant="primary" loading={loading} fullWidth className="mt-2">
                  {loading ? "Updating..." : "Update password"}
                </Button>
              </form>
            </div>
          )}
        </GlassPanel>

        <p className="text-center text-[13px] mt-6" style={{ color: "var(--tf-ink-muted)" }}>
          <Link to="/login" className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: "var(--tf-teal)" }}>
            <ArrowLeft size={13} />
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
