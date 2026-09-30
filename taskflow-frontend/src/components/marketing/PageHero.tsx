import type { ReactNode } from "react";
import { Container } from "./Bits";
import { HeroBackdrop } from "./HeroBackdrop";

/** Shared header for inner pages: one h1, animated backdrop, staggered entrance. */
export function PageHero({ title, lead, children }: { title: string; lead: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden py-16 sm:py-24" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
      <div className="aurora pointer-events-none absolute inset-0" aria-hidden="true" />
      <HeroBackdrop dim />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="rise font-display text-[32px] font-semibold leading-[1.1] text-balance sm:text-[48px]">{title}</h1>
          <p className="rise mx-auto mt-4 max-w-[56ch] text-[16px] leading-relaxed sm:text-[17px]" style={{ animationDelay: "100ms", color: "var(--tf-ink-muted)" }}>{lead}</p>
          {children && <div className="rise mt-8" style={{ animationDelay: "200ms" }}>{children}</div>}
        </div>
      </Container>
    </section>
  );
}