import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Sparkles, Menu, X } from "lucide-react";
import { Container, ButtonLink } from "./Bits";
import { NAV } from "../../data/marketing";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tf-teal)]";
const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-1 py-2 text-[14px] transition-colors motion-reduce:transition-none ${FOCUS} ${isActive ? "text-white" : "hover:text-white"}`;

function Logo() {
  return (
    <Link to="/" aria-label="TaskFlow AI home" className={`flex items-center gap-2 rounded-md ${FOCUS}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg,#2563EB,#14B8A6)" }}>
        <Sparkles size={16} color="#fff" aria-hidden="true" />
      </span>
      <span className="font-display text-[16px] font-semibold">TaskFlow AI</span>
    </Link>
  );
}

export function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div style={{ background: "var(--tf-void)", color: "var(--tf-ink)" }} className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: "rgba(5,7,12,0.85)", borderBottom: "1px solid var(--tf-panel-border)" }}>
        <Container className="flex h-16 items-center justify-between">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-7 md:flex" style={{ color: "var(--tf-ink-muted)" }}>
            {NAV.map((l) => <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-4 md:flex">
            <Link to="/login" className={`rounded-md py-2 text-[14px] font-medium ${FOCUS}`} style={{ color: "var(--tf-ink-muted)" }}>Log in</Link>
            <ButtonLink to="/signup">Get started</ButtonLink>
          </div>
          <button
            type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}
            className={`flex h-11 w-11 items-center justify-center rounded-xl md:hidden ${FOCUS}`} style={{ border: "1px solid var(--tf-panel-border)" }}
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </Container>

        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="md:hidden" style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
            <Container className="flex flex-col gap-1 pb-4 pt-2" >
              {NAV.map((l) => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => `flex min-h-11 items-center rounded-lg px-2 text-[15px] ${FOCUS} ${isActive ? "text-white" : ""}`} style={{ color: "var(--tf-ink-muted)" }}>{l.label}</NavLink>
              ))}
              <Link to="/login" className={`flex min-h-11 items-center rounded-lg px-2 text-[15px] ${FOCUS}`}>Log in</Link>
              <ButtonLink to="/signup">Get started</ButtonLink>
            </Container>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1"><Outlet /></main>

      <footer style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
        <Container className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          <div className="col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>Task management that reads your projects and tells you what to do next.</p>
          </div>
          <nav aria-label="Product">
            <h2 className="mb-3 text-[13px] font-semibold">Product</h2>
            <ul className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>
              <li><Link to="/features" className="hover:text-white">Features</Link></li>
              <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/signup" className="hover:text-white">Sign up</Link></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2 className="mb-3 text-[13px] font-semibold">Company</h2>
            <ul className="flex flex-col gap-2 text-[13px]" style={{ color: "var(--tf-ink-muted)" }}>
              <li><Link to="/about" className="hover:text-white">About</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
            </ul>
          </nav>
        </Container>
        <Container className="pb-8 text-[12px]" >
          <p style={{ color: "var(--tf-ink-muted)" }}>© 2026 TaskFlow AI. All rights reserved.</p>
        </Container>
      </footer>
    </div>
  );
}
