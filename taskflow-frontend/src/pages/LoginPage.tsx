import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Mail, Lock, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";

export function LoginPage() {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      // error is already surfaced via useAuth().error
    }
  }

  function fillDemo() {
    setEmail("admin@taskflow.ai");
    setPassword("password");
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

        <div className="ai-pulse-wrap p-6 sm:p-8" style={{ background: "var(--tf-surface)" }}>
          <div>
            <h1 className="text-[20px] font-display font-semibold mb-1" style={{ color: "var(--tf-ink)" }}>
              Welcome back
            </h1>
            <p className="text-[13px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
              Log in to your mission control.
            </p>

            {error && (
              <div className="flex items-start gap-2 text-[12px] p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.1)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label htmlFor="login-email" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
                  Email
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-ink-muted)" }} />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearError();
                    }}
                    placeholder="you@company.com"
                    className="w-full text-[13px] pl-9 pr-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="text-[11px] font-mono block mb-1" style={{ color: "var(--tf-ink-muted)" }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--tf-ink-muted)" }} />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                    }}
                    placeholder="••••••••"
                    className="w-full text-[13px] pl-9 pr-3 py-2.5 rounded-xl outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" loading={loading} fullWidth className="mt-2">
                {loading ? "Logging in..." : "Log in"}
              </Button>
            </form>

            <button onClick={fillDemo} className="w-full text-center text-[12px] mt-4" style={{ color: "var(--tf-ink-muted)" }}>
              Use demo admin account
            </button>
          </div>
        </div>

        <p className="text-center text-[13px] mt-6" style={{ color: "var(--tf-ink-muted)" }}>
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium" style={{ color: "var(--tf-teal)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
