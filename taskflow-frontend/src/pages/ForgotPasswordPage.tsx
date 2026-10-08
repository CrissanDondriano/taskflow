import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Sparkles, Mail, AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/Button";
import { GlassPanel, TextField } from "../components/ui/Primitives";
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
          {sent ? (
            <div>
              <h1 className="text-[20px] font-display font-semibold mb-1" style={{ color: "var(--tf-ink)" }}>
                Check your inbox
              </h1>
              <p className="text-[13px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
                If an account exists for <span style={{ color: "var(--tf-ink)" }}>{email.trim()}</span>, a reset link is on its way. The
                link expires shortly — request a new one if it doesn't arrive.
              </p>
              <Button variant="primary" fullWidth onClick={() => setSent(false)}>
                Send another link
              </Button>
            </div>
          ) : (
            <div>
              <h1 className="text-[20px] font-display font-semibold mb-1" style={{ color: "var(--tf-ink)" }}>
                Forgot your password?
              </h1>
              <p className="text-[13px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
                Enter your email and we'll send you a reset link.
              </p>

              {error && (
                <div role="alert" className="flex items-start gap-2 text-[12px] p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.1)", color: "var(--tf-danger-text)", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                <TextField
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
                  icon={<Mail size={14} />}
                  error={fieldError}
                />

                <Button type="submit" variant="primary" loading={loading} fullWidth className="mt-2">
                  {loading ? "Sending..." : "Send reset link"}
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
