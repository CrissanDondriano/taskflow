import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Sparkles, Menu, X, ArrowUp, Mail } from "lucide-react";
import { Container, ButtonLink } from "./Bits";
import { NAV } from "../../data/marketing";
import "../../styles/marketing.css";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tf-teal)]";
const MUTED = { color: "var(--tf-ink-muted)" };
const FOOTER = [
  { title: "Product", links: [["Home", "/"], ["Features", "/features"], ["Pricing", "/pricing"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"]] },
  { title: "Account", links: [["Log in", "/login"], ["Sign up free", "/signup"]] },
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link py-2 text-[14px] font-medium transition-colors motion-reduce:transition-none ${FOCUS} ${isActive ? "is-active text-white" : "text-[color:var(--tf-ink-muted)] hover:text-white"}`;

function Logo() {
  return (
    <Link to="/" aria-label="TaskFlow AI home" className={`flex items-center gap-2.5 rounded-md ${FOCUS}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg,#2563EB,#14B8A6)" }}>
        <Sparkles size={17} color="#fff" aria-hidden="true" />
      </span>
      <span className="font-display text-[17px] font-semibold">TaskFlow AI</span>
    </Link>
  );
}

export function MarketingLayout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const toTop = () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });

  return (
    <div style={{ background: "var(--tf-void)", color: "var(--tf-ink)" }} className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-black">Skip to content</a>

      <header className="sticky top-0 z-40 backdrop-blur-xl transition-[background,box-shadow,border-color] duration-300 motion-reduce:transition-none"
        style={{ background: scrolled || open ? "rgba(5,7,12,0.92)" : "rgba(5,7,12,0.55)", borderBottom: `1px solid ${scrolled || open ? "var(--tf-panel-border)" : "transparent"}`, boxShadow: scrolled ? "0 8px 30px rgba(0,0,0,0.35)" : "none" }}>
        <Container className="flex h-16 items-center justify-between gap-6">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
            {NAV.map((l) => <NavLink key={l.to} to={l.to} end={l.to === "/"} className={navClass}>{l.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className={`rounded-md px-3 py-2 text-[14px] font-medium transition-colors hover:text-white motion-reduce:transition-none ${FOCUS}`} style={MUTED}>Log in</Link>
            <ButtonLink to="/signup">Get started</ButtonLink>
          </div>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}
            className={`flex h-11 w-11 items-center justify-center rounded-xl md:hidden ${FOCUS}`} style={{ border: "1px solid var(--tf-panel-border)" }}>
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </Container>

        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="menu-in absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto md:hidden" style={{ background: "rgba(5,7,12,0.98)", borderBottom: "1px solid var(--tf-panel-border)" }}>
            <Container className="flex flex-col gap-1 pb-6 pt-3">
              {NAV.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.to === "/"}
                  className={({ isActive }) => `flex min-h-12 items-center rounded-xl px-4 text-[16px] font-medium ${FOCUS} ${isActive ? "bg-white/5 text-white" : "text-[color:var(--tf-ink-muted)]"}`}>{l.label}</NavLink>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <ButtonLink to="/login" variant="ghost">Log in</ButtonLink>
                <ButtonLink to="/signup">Get started</ButtonLink>
              </div>
            </Container>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1"><Outlet /></main>

      <footer style={{ borderTop: "1px solid var(--tf-panel-border)", background: "rgba(255,255,255,0.015)" }}>
        <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-14 lg:grid-cols-12">
          <div className="col-span-2 lg:col-span-6">
            <Logo />
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed" style={MUTED}>Task management that reads your projects, ranks work by risk and tells your team what to do next.</p>
            <a href="mailto:hello@taskflow.ai" className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-md text-[14px] transition-colors hover:text-white motion-reduce:transition-none ${FOCUS}`} style={MUTED}>
              <Mail size={16} aria-hidden="true" /> hello@taskflow.ai
            </a>
          </div>
          {FOOTER.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <h2 className="mb-3 text-[13px] font-semibold">{col.title}</h2>
              <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px]">
                {col.links.map(([label, to]) => (
                  <li key={to}><Link to={to} className={`inline-block rounded-md py-1.5 transition-colors hover:text-white motion-reduce:transition-none ${FOCUS}`} style={MUTED}>{label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
        </Container>
        <div style={{ borderTop: "1px solid var(--tf-panel-border)" }}>
          <Container className="flex flex-col items-center justify-between gap-3 py-5 text-[13px] sm:flex-row">
            <p style={MUTED}>© 2026 TaskFlow AI. All rights reserved.</p>
            <button type="button" onClick={toTop} className={`inline-flex min-h-11 items-center gap-2 rounded-md px-2 transition-colors hover:text-white motion-reduce:transition-none ${FOCUS}`} style={MUTED}>
              Back to top <ArrowUp size={14} aria-hidden="true" />
            </button>
          </Container>
        </div>
      </footer>
    </div>
  );
}