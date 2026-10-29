import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  AuthAlert,
  AuthField,
  AuthLayout,
  AuthRequirements,
  AuthSubmit,
} from "../components/auth/AuthLayout";
import { usePageMeta } from "../hooks/usePageMeta";
import { ApiError } from "../lib/api";

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
  usePageMeta("Sign up", "Create a free TaskFlow AI account and turn your next meeting notes into a prioritized board.");

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
    } catch (err) {
      // Surface Laravel 422 validation errors under their fields (e.g. an
      // email that's already taken). If every error landed inline, drop the
      // generic banner so the same message isn't shown twice.
      if (err instanceof ApiError && err.fields) {
        const known: { name?: string; email?: string; password?: string } = {};
        let allPlaced = true;
        for (const [field, message] of Object.entries(err.fields)) {
          if (field === "name" || field === "email" || field === "password") known[field] = message;
          else allPlaced = false;
        }
        if (Object.keys(known).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...known }));
          if (allPlaced) clearError();
        }
      }
      // Anything else is surfaced via useAuth().error.
    }
  }

  return (
    <AuthLayout
      heroTitle={
        <>
          Start your
          <br />
          mission.
        </>
      }
      heroSubtitle="Start planning smarter with AI, free."
      mobileAction={{ label: "Log in", to: "/login" }}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="auth-footer-link">
            Log in
          </Link>
        </>
      }
    >
      <header className="auth-head">
        <h1 className="auth-title font-display">Create your account</h1>
        <p className="auth-sub">Start planning smarter with AI, free.</p>
      </header>

      {error && <AuthAlert>{error}</AuthAlert>}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <AuthField
          id="signup-name"
          label="Full name"
          required
          value={name}
          onChange={(v) => {
            setName(v);
            setFieldErrors((prev) => ({ ...prev, name: undefined }));
            clearError();
          }}
          autoComplete="name"
          placeholder="Jade Santos"
          error={fieldErrors.name}
        />

        <AuthField
          id="signup-email"
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
          id="signup-password"
          label="Password"
          type="password"
          required
          value={password}
          onChange={(v) => {
            setPassword(v);
            setFieldErrors((prev) => ({ ...prev, password: undefined }));
            clearError();
          }}
          autoComplete="new-password"
          placeholder="Create a password"
          error={fieldErrors.password}
          hintId="signup-password-requirements"
        >
          <div id="signup-password-requirements">
            <AuthRequirements
              items={REQUIREMENTS.map((r) => ({ label: r.label, met: r.test(password) }))}
            />
          </div>
        </AuthField>

        <AuthSubmit loading={loading}>{loading ? "Creating account…" : "Create account"}</AuthSubmit>
      </form>
    </AuthLayout>
  );
}
