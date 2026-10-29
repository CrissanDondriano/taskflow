import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthAlert, AuthField, AuthLayout, AuthSubmit } from "../components/auth/AuthLayout";
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
    <AuthLayout
      heroTitle={
        <>
          Locked out?
          <br />
          We&apos;ve got you.
        </>
      }
      heroSubtitle="Reset your password in a minute."
      mobileAction={{ label: "Log in", to: "/login" }}
      footerAlign="left"
      footer={
        <Link to="/login" className="auth-footer-link">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to log in
        </Link>
      }
    >
      {!hasLink ? (
        <div>
          <div className="auth-status-icon" style={{ background: "rgba(245,158,11,0.12)", borderColor: "rgba(245,158,11,0.35)", color: "#fcd34d" }}>
            <AlertTriangle size={22} aria-hidden="true" />
          </div>
          <h1 className="auth-title font-display">Invalid reset link</h1>
          <p className="auth-note" style={{ marginTop: "1.125rem" }}>
            This link is incomplete or malformed. Request a fresh one and open it from your inbox.
          </p>
          <button
            type="button"
            className="auth-submit auth-focus"
            style={{ marginTop: 0 }}
            onClick={() => navigate("/forgot-password")}
          >
            Request a new link
          </button>
        </div>
      ) : done ? (
        <div role="status">
          <div className="auth-status-icon">
            <CheckCircle2 size={22} aria-hidden="true" />
          </div>
          <h1 className="auth-title font-display">Password updated</h1>
          <p className="auth-note" style={{ marginTop: "1.125rem" }}>
            Your password has been changed. Log in with your new credentials.
          </p>
          <button
            type="button"
            className="auth-submit auth-focus"
            style={{ marginTop: 0 }}
            onClick={() => navigate("/login")}
          >
            Go to log in
          </button>
        </div>
      ) : (
        <>
          <header className="auth-head">
            <h1 className="auth-title font-display">Set a new password</h1>
            <p className="auth-sub">
              Choose a password of at least 8 characters for <strong style={{ color: "#e2e8f0", fontWeight: 500 }}>{email}</strong>.
            </p>
          </header>

          {error && <AuthAlert>{error}</AuthAlert>}

          <form onSubmit={handleSubmit} noValidate className="auth-form">
            <AuthField
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
              placeholder="At least 8 characters"
              error={fieldErrors.password}
            />

            <AuthField
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
              placeholder="Repeat your password"
              error={fieldErrors.confirm}
            />

            <AuthSubmit loading={loading}>{loading ? "Updating…" : "Update password"}</AuthSubmit>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
