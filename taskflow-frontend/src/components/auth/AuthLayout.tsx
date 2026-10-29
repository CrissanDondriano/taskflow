import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import "../../styles/auth.css";

const FOCUS = "auth-focus";

function Logo() {
  return (
    <Link to="/" aria-label="TaskFlow AI home" className={`auth-logo ${FOCUS}`}>
      <span className="auth-logo-mark" aria-hidden="true">
        <Sparkles size={20} color="#fff" />
      </span>
      <span className="auth-logo-word font-display">
        TaskFlow <span className="auth-logo-ai">AI</span>
      </span>
    </Link>
  );
}

/**
 * Decorative task preview for the brand panel. Generic project names only —
 * it mirrors the hero mockup's risk/track language without inventing people.
 */
function TaskMockup() {
  return (
    <div className="auth-mockup" aria-hidden="true">
      <div className="auth-task auth-task--risk">
        <div className="auth-task-head">
          <span className="auth-task-title">Month-end audit</span>
          <span className="auth-task-status">At risk</span>
        </div>
        <div className="auth-bar">
          <span style={{ width: "72%" }} />
        </div>
      </div>
      <div className="auth-task auth-task--track">
        <div className="auth-task-head">
          <span className="auth-task-title">Homepage mockups</span>
          <span className="auth-task-status">On track</span>
        </div>
        <div className="auth-bar">
          <span style={{ width: "34%" }} />
        </div>
      </div>
    </div>
  );
}

export function AuthLayout({
  heroTitle,
  heroSubtitle,
  mobileAction,
  footer,
  footerAlign = "center",
  children,
}: {
  /** Display headline in the left brand panel (desktop only). */
  heroTitle: ReactNode;
  heroSubtitle: string;
  /** Contextual account link in the mobile top bar. */
  mobileAction: { label: string; to: string };
  footer: ReactNode;
  footerAlign?: "center" | "left";
  children: ReactNode;
}) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <Logo />
        <div className="auth-brand-body">
          <p className="auth-hero-title font-display">{heroTitle}</p>
          <p className="auth-hero-sub">{heroSubtitle}</p>
          <TaskMockup />
        </div>
      </aside>

      <main id="main" className="auth-main">
        <div className="auth-mobile-bar">
          <Logo />
          <Link to={mobileAction.to} className={`auth-mobile-link ${FOCUS}`}>
            {mobileAction.label}
          </Link>
        </div>

        <div className="auth-form-col">
          {children}
          <div className={`auth-footer ${footerAlign === "left" ? "auth-footer--left" : ""}`}>{footer}</div>
        </div>
      </main>
    </div>
  );
}

/**
 * Labelled auth input matching the reference design: 56–60px tall, dark
 * fill, mono label. Same accessibility wiring as the app-wide TextField
 * (label → input, error → aria-invalid + aria-describedby).
 */
export function AuthField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  error,
  hintId,
  required,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  /** id of extra helper content linked via aria-describedby. */
  hintId?: string;
  required?: boolean;
  children?: ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hintId}
        placeholder={placeholder}
        className={`auth-input ${error ? "is-invalid" : ""}`}
      />
      {error && (
        <p id={errorId} role="alert" className="auth-error">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}

export function AuthSubmit({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button type="submit" className={`auth-submit ${FOCUS}`} disabled={loading}>
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export function AuthAlert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="auth-alert">
      <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** Live password-rule checklist shown under the signup password field. */
export function AuthRequirements({ items }: { items: { label: string; met: boolean }[] }) {
  return (
    <ul className="auth-reqs" aria-label="Password requirements">
      {items.map((item) => (
        <li key={item.label} className={`auth-req ${item.met ? "is-met" : ""}`}>
          <span className="auth-req-dot" aria-hidden="true">
            {item.met && <Check size={10} strokeWidth={3} />}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}
