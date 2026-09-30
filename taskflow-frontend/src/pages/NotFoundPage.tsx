import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Container, ButtonLink } from "../components/marketing/Bits";
import { HeroBackdrop } from "../components/marketing/HeroBackdrop";
import { usePageMeta } from "../hooks/usePageMeta";

const LINKS = [["Home", "/"], ["Features", "/features"], ["Pricing", "/pricing"], ["Contact", "/contact"]] as const;

export function NotFoundPage({ compact = false }: { compact?: boolean }) {
  const { pathname } = useLocation();
  usePageMeta("Page not found", "The page you're looking for doesn't exist or has moved.");
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  if (compact) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-[28px] font-semibold">Page not found</h1>
        <p className="mt-3 text-[14px]" style={{ color: "var(--tf-ink-muted)" }}>This dashboard page doesn't exist.</p>
        <div className="mt-6"><ButtonLink to="/dashboard">Back to dashboard</ButtonLink></div>
      </div>
    );
  }

  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden py-20 sm:py-28">
      <div className="aurora pointer-events-none absolute inset-0" aria-hidden="true" />
      <HeroBackdrop dim />
      <Container className="relative text-center">
        <p aria-hidden="true" className="rise text-gradient font-display text-[96px] font-semibold leading-none sm:text-[140px]">404</p>
        <h1 className="rise mt-2 font-display text-[28px] font-semibold sm:text-[36px]" style={{ animationDelay: "80ms" }}>Page not found</h1>
        <p className="rise mx-auto mt-3 max-w-[48ch] break-all text-[15px] leading-relaxed" style={{ animationDelay: "160ms", color: "var(--tf-ink-muted)" }}>
          We couldn't find <span className="text-white">{pathname}</span>. It may have moved, or the link may be wrong.
        </p>
        <div className="rise mt-8" style={{ animationDelay: "240ms" }}><ButtonLink to="/">Back to home</ButtonLink></div>
        <ul className="rise m-0 mt-8 flex list-none flex-wrap items-center justify-center gap-x-6 gap-y-2 p-0 text-[14px]" style={{ animationDelay: "320ms" }}>
          {LINKS.map(([label, to]) => <li key={to}><Link to={to} className="underline underline-offset-4" style={{ color: "var(--tf-ink-muted)" }}>{label}</Link></li>)}
        </ul>
      </Container>
    </section>
  );
}