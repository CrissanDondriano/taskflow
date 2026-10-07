import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * App-level error boundary. Wraps the whole router in main.tsx so a crash in
 * one component renders this fallback instead of a blank white page. Logging
 * goes to the console only — there's no error-reporting service in this app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-4"
        style={{ background: "var(--tf-void)" }}
      >
        <div
          className="w-full max-w-sm rounded-2xl p-6 text-center"
          style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-panel-border)" }}
          role="alert"
        >
          <div
            className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.12)", color: "var(--tf-danger-text)" }}
          >
            <AlertTriangle size={18} />
          </div>
          <h1 className="text-[16px] font-semibold font-display mb-1" style={{ color: "var(--tf-ink)" }}>
            Something went wrong
          </h1>
          <p className="text-[13px] mb-5" style={{ color: "var(--tf-ink-muted)" }}>
            An unexpected error interrupted this page. Reloading usually fixes it — your data is safe.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--tf-primary)", color: "white", border: "1px solid transparent" }}
            >
              <RefreshCw size={14} /> Reload
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-90"
              style={{ color: "var(--tf-ink)", border: "1px solid var(--tf-panel-border)" }}
            >
              <Home size={14} /> Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
