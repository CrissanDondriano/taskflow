import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "teal" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, { background: string; color: string; border: string; boxShadow?: string }> = {
  primary: { background: "var(--tf-primary)", color: "white", border: "1px solid transparent", boxShadow: "0 0 16px rgba(37,99,235,0.4)" },
  teal: { background: "var(--tf-teal)", color: "white", border: "1px solid transparent", boxShadow: "0 0 16px rgba(20,184,166,0.4)" },
  secondary: { background: "transparent", color: "var(--tf-ink)", border: "1px solid var(--tf-panel-border)" },
  ghost: { background: "transparent", color: "var(--tf-ink-muted)", border: "1px solid transparent" },
  danger: { background: "rgba(239,68,68,0.1)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,0.3)" },
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-[12px] gap-1.5",
  md: "px-4 py-2 text-[13px] gap-2",
};

/**
 * The app's single source of truth for button styling. Used across primary
 * flows — forms, modals, top bar actions, landing CTAs. Icon-only utility
 * buttons (close, chevron, menu) intentionally stay as plain <button>s
 * elsewhere since they don't share this component's visual language.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, icon, fullWidth = false, disabled, children, className = "", style, ...rest }, ref) => {
    const v = VARIANT_STYLES[variant];
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-xl font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed ${SIZE_STYLES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        style={{ background: v.background, color: v.color, border: v.border, boxShadow: v.boxShadow, ...style }}
        {...rest}
      >
        {loading ? <Loader2 size={size === "sm" ? 13 : 15} className="animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
