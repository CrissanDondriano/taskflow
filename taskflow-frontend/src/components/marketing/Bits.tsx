import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tf-teal)]";

/** One shared page grid: same gutters and max width on every page. */
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function SectionHead({ id, title, lead }: { id?: string; title: string; lead?: string }) {
  return (
    <div className="mb-10 max-w-2xl lg:mb-12">
      <h2 id={id} className="font-display text-[26px] font-semibold leading-tight text-balance sm:text-[32px]">{title}</h2>
      {lead && <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{lead}</p>}
    </div>
  );
}

export function ButtonLink({ to, children, variant = "primary" }: { to: string; children: ReactNode; variant?: "primary" | "ghost" }) {
  const style = variant === "primary"
    ? { background: "var(--tf-primary)", color: "#fff" }
    : { border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" };
  return (
    <Link to={to} style={style} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-6 text-[14px] font-medium transition-opacity hover:opacity-90 motion-reduce:transition-none ${FOCUS}`}>
      {children}
    </Link>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((f) => (
        <details key={f.q} className="group rounded-2xl" style={{ border: "1px solid var(--tf-panel-border)" }}>
          <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-4 text-[14px] font-medium ${FOCUS}`}>
            {f.q}
            <span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
          </summary>
          <p className="px-4 pb-4 text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
