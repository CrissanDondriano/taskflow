import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Sparkles, User, Mail, Lock, AlertTriangle, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";

const REQUIREMENTS = [
  { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { label: "One number", test: (pw: string) => /\d/.test(pw) },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupPage() {
  const { signup, loading, error, clearError, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  // Already signed in? Don't show the form again — go straight to the app.
  if (user) return <Navigate to="/dashboard" replace />;

  function validate() {
    const errs: { name?: string; email?: string; password?: string } = {};
    if (!name.trim()) errs.name = "Enter your full name.";
    if (!email.trim()) errs.email = "Enter your email address.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!REQUIREMENTS.every((r) => r.test(password)))
      errs.password = "Password must be at least 8 characters and include a number.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await signup(name, email, password);
      navigate("/dashboard");
    } catch {
      // error surfaced via useAuth().error
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4" style={{ background: "var(--tf-void)" }}>
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(700px circle at 80% 20%, rgba(37,99,235,0.16), transparent 60%), radial-gradient(600px circle at 20% 80%, rgba(20,184,166,0.12), transparent 60%)",
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

        <div className="ai-pulse-wrap p-6 sm:p-8" style={{ background: "var(--tf-surface)" }}>
          <h1 className="text-[20px] font-display font-semibold mb-1" style={{ color: "var(--tf-ink)" }}>
              Create your account
            </h1>
            <p className="text-[13px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
              Start planning smarter with AI, free.
            </p>

            {error && (
              <div role="alert" className="flex items-start gap-2 text-[12px] p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.1)", color: "var(--tf-danger-text)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
              <div>
                <label htmlFor="signup-name" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
                  Full name
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-ink-muted)" }} />
                  <input
                    id="signup-name"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, name: undefined }));
                      clearError();
                    }}
                    aria-invalid={fieldErrors.name ? true : undefined}
                    aria-describedby={fieldErrors.name ? "signup-name-error" : undefined}
                    placeholder="Jade Santos"
                    className="w-full text-[13px] pl-9 pr-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "var(--tf-fill-04)", border: `1px solid ${fieldErrors.name ? "rgba(239,68,68,0.5)" : "var(--tf-panel-border)"}`, color: "var(--tf-ink)" }}
                  />
                </div>
                {fieldErrors.name && (
                  <p id="signup-name-error" role="alert" className="text-[11px] mt-1" style={{ color: "var(--tf-danger-text)" }}>
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="signup-email" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
                  Email
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-ink-muted)" }} />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      clearError();
                    }}
                    aria-invalid={fieldErrors.email ? true : undefined}
                    aria-describedby={fieldErrors.email ? "signup-email-error" : undefined}
                    placeholder="you@company.com"
                    className="w-full text-[13px] pl-9 pr-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "var(--tf-fill-04)", border: `1px solid ${fieldErrors.email ? "rgba(239,68,68,0.5)" : "var(--tf-panel-border)"}`, color: "var(--tf-ink)" }}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="signup-email-error" role="alert" className="text-[11px] mt-1" style={{ color: "var(--tf-danger-text)" }}>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="signup-password" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-ink-muted)" }} />
                  <input
                    id="signup-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      clearError();
                    }}
                    aria-invalid={fieldErrors.password ? true : undefined}
                    aria-describedby={fieldErrors.password ? "signup-password-error" : "signup-password-requirements"}
                    placeholder="••••••••"
                    className="w-full text-[13px] pl-9 pr-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "var(--tf-fill-04)", border: `1px solid ${fieldErrors.password ? "rgba(239,68,68,0.5)" : "var(--tf-panel-border)"}`, color: "var(--tf-ink)" }}
                  />
                </div>
                {fieldErrors.password && (
                  <p id="signup-password-error" role="alert" className="text-[11px] mt-1" style={{ color: "var(--tf-danger-text)" }}>
                    {fieldErrors.password}
                  </p>
                )}
                <div id="signup-password-requirements" className="flex flex-col gap-1 mt-2">
                  {REQUIREMENTS.map((r) => {
                    const met = r.test(password);
                    return (
                      <div key={r.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: met ? "var(--tf-teal)" : "var(--tf-ink-muted)" }}>
                        <Check size={11} style={{ opacity: met ? 1 : 0.3 }} /> {r.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" variant="primary" loading={loading} fullWidth className="mt-2">
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
        </div>

        <p className="text-center text-[13px] mt-6" style={{ color: "var(--tf-ink-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" className="font-medium" style={{ color: "var(--tf-teal)" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
