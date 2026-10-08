import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { GlassPanel, TextField } from "../components/ui/Primitives";
import { usePageMeta } from "../hooks/usePageMeta";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { login, loading, error, clearError, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  usePageMeta("Log in", "Sign in to your TaskFlow AI workspace and pick up where your mission control left off.");

  // Already signed in? Don't show the form again — go straight to the app.
  if (user) return <Navigate to="/dashboard" replace />;

  function validate() {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) errs.email = "Enter your email address.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      // error is already surfaced via useAuth().error
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
          <div>
            <h1 className="text-[20px] font-display font-semibold mb-1" style={{ color: "var(--tf-ink)" }}>
              Welcome back
            </h1>
            <p className="text-[13px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
              Log in to your mission control.
            </p>

            {error && (
              <div role="alert" className="flex items-start gap-2 text-[12px] p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.1)", color: "var(--tf-danger-text)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
              <TextField
                id="login-email"
                label="Email"
                type="email"
                required
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  clearError();
                }}
                autoComplete="email"
                placeholder="you@company.com"
                icon={<Mail size={14} />}
                error={fieldErrors.email}
              />

              <TextField
                id="login-password"
                label="Password"
                type="password"
                required
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  clearError();
                }}
                autoComplete="current-password"
                placeholder="••••••••"
                icon={<Lock size={14} />}
                error={fieldErrors.password}
              />

              <div className="flex justify-end -mt-1">
                <Link to="/forgot-password" className="text-[12px] hover:underline" style={{ color: "var(--tf-teal)" }}>
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" variant="primary" loading={loading} fullWidth className="mt-2">
                {loading ? "Logging in..." : "Log in"}
              </Button>
            </form>

          </div>
        </GlassPanel>

        <p className="text-center text-[13px] mt-6" style={{ color: "var(--tf-ink-muted)" }}>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium hover:underline" style={{ color: "var(--tf-teal)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
