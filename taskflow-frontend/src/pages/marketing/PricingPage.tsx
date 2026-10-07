import { Download, KanbanSquare, Sparkles } from "lucide-react";
import { Container, SectionHead, Faq } from "../../components/marketing/Bits";
import { Reveal } from "../../components/marketing/Reveal";
import { PageHero } from "../../components/marketing/PageHero";
import { PricingCards, CtaBand, JsonLd } from "../../components/marketing/Sections";
import { usePageMeta } from "../../hooks/usePageMeta";
import { FAQS } from "../../data/marketing";

const INCLUDED = [
  { icon: KanbanSquare, title: "Board and calendar", desc: "Kanban and calendar views on every plan." },
  { icon: Sparkles, title: "AI assistant", desc: "5 queries a day on Free, the full suite on Pro." },
  { icon: Download, title: "Data export", desc: "Take your tasks, reports and files with you any time." },
];

export function PricingPage() {
  usePageMeta("Pricing", "Start free with 3 projects. Upgrade to Pro at $14 per user per month, or contact us for Enterprise.");
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <JsonLd data={faqLd} />
      <PageHero title="Simple pricing that grows with your team" lead="Start free. Upgrade when you need more projects or the full AI suite." />
      <section aria-label="Plans" className="py-16 lg:py-24"><Container><PricingCards level={2} /></Container></section>

      <section aria-labelledby="included" className="py-16 lg:py-20" style={{ background: "var(--tf-fill-015)" }}>
        <Container>
          <Reveal><SectionHead id="included" title="On every plan" /></Reveal>
          <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-3">
            {INCLUDED.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 100}>
                  <Icon size={22} color="var(--tf-accent-text)" aria-hidden="true" />
                  <h3 className="mb-1.5 mt-3 text-[16px] font-semibold">{title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="pricing-faq" className="py-16 lg:py-24">
        <Container className="max-w-3xl">
          <Reveal><SectionHead id="pricing-faq" title="Pricing questions" /></Reveal>
          <Reveal delay={100}><Faq items={FAQS} /></Reveal>
        </Container>
      </section>
      <CtaBand title="Try it on a real project this week" />
    </>
  );
}