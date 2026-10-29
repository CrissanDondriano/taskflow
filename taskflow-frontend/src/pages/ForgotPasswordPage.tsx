import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthAlert, AuthField, AuthLayout, AuthSubmit } from "../components/auth/AuthLayout";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  usePageMeta("Forgot password", "Request a TaskFlow AI password reset link by email.");

  // Already signed in? A reset link would be pointless.
  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const value = email.trim();
    if (!value) {
      setFieldError("Enter your email address.");
      return;
    }
    if (!EMAIL_RE.test(value)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    setFieldError(undefined);

    setLoading(true);
    try {
      await api.post("/forgot-password", { email: value });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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
      {sent ? (
        <div role="status">
          <div className="auth-status-icon">
            <CheckCircle2 size={22} aria-hidden="true" />
          </div>
          <h1 className="auth-title font-display">Check your inbox</h1>
          <p className="auth-note" style={{ marginTop: "1.125rem" }}>
            If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. The link
            expires shortly — request a new one if it doesn&apos;t arrive.
          </p>
          <button
            type="button"
            className="auth-submit auth-focus"
            style={{ marginTop: 0 }}
            onClick={() => setSent(false)}
          >
            Send another link
          </button>
        </div>
      ) : (
        <>
          <header className="auth-head">
            <h1 className="auth-title font-display">Forgot your password?</h1>
            <p className="auth-sub">Enter your email and we&apos;ll send you a reset link.</p>
          </header>

          {error && <AuthAlert>{error}</AuthAlert>}

          <form onSubmit={handleSubmit} noValidate className="auth-form">
            <AuthField
              id="forgot-email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(v) => {
                setEmail(v);
                setFieldError(undefined);
                setError(null);
              }}
              autoComplete="email"
              placeholder="you@company.com"
              error={fieldError}
            />

            <AuthSubmit loading={loading}>{loading ? "Sending…" : "Send reset link"}</AuthSubmit>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
