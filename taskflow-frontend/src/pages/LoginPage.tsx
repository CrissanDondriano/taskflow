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

        <div className="auth-social-buttons">
          <p className="auth-social-text">Or continue with</p>
          <div className="auth-social-row">
            <button
              type="button"
              className="auth-social-btn auth-social-btn--google"
              disabled
              aria-label="Continue with Google (coming soon)"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              className="auth-social-btn auth-social-btn--github"
              disabled
              aria-label="Continue with GitHub (coming soon)"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
              </svg>
              GitHub
            </button>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
