import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthAlert, AuthField, AuthLayout, AuthSubmit } from "../components/auth/AuthLayout";
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
    <AuthLayout
      heroTitle={
        <>
          Log in to your
          <br />
          mission control.
        </>
      }
      heroSubtitle="Turn plans into tasks in minutes."
      mobileAction={{ label: "Sign up", to: "/signup" }}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="auth-footer-link">
            Sign up
          </Link>
        </>
      }
    >
      <header className="auth-head">
        <h1 className="auth-title font-display">Welcome back</h1>
        <p className="auth-sub">Log in to your mission control.</p>
      </header>

      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <AuthField
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
          error={fieldErrors.email}
        />

        <AuthField
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
          placeholder="Enter your password"
          error={fieldErrors.password}
        />

        <div className="auth-row-end">
          <Link to="/forgot-password" className="auth-inline-link">
            Forgot password?
          </Link>
        </div>

        <AuthSubmit loading={loading}>{loading ? "Logging in…" : "Log in"}</AuthSubmit>
      </form>
    </AuthLayout>
  );
}
