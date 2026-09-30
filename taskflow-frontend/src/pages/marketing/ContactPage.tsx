import { useState, type FormEvent } from "react";
import { Mail, Briefcase, LifeBuoy, CheckCircle2 } from "lucide-react";
import { Container, SectionHead, Faq } from "../../components/marketing/Bits";
import { Reveal } from "../../components/marketing/Reveal";
import { PageHero } from "../../components/marketing/PageHero";
import { usePageMeta } from "../../hooks/usePageMeta";
import { FAQS } from "../../data/marketing";

type Field = "name" | "email" | "message";
type Errors = Partial<Record<Field, string>>;

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tf-teal)]";
const FIELD = `min-h-11 w-full rounded-xl bg-transparent px-3.5 py-2.5 text-[14px] transition-colors motion-reduce:transition-none ${FOCUS}`;
const PANEL = { background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" };
const MUTED = { color: "var(--tf-ink-muted)" };
const TOPICS = ["Pricing and plans", "Enterprise and security", "Help with my account", "Something else"];
const INFO = [
  { icon: Briefcase, title: "Sales and Enterprise", desc: "Plans, SSO, custom integrations and security questions." },
  { icon: LifeBuoy, title: "Help with your account", desc: "Something not working? Tell us what you saw and we'll dig in." },
  { icon: Mail, title: "Email us directly", desc: "hello@taskflow.ai" },
];
const NEXT = ["You send your message.", "We read it and reply by email.", "If it helps, we set up a short call."];

function validate(d: FormData): Errors {
  const e: Errors = {};
  if (!String(d.get("name")).trim()) e.name = "Enter your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.get("email")).trim())) e.email = "Enter a valid email, like name@company.com.";
  if (String(d.get("message")).trim().length < 10) e.message = "Tell us a little more (at least 10 characters).";
  return e;
}

export function ContactPage() {
  usePageMeta("Contact", "Talk to the TaskFlow AI team about plans, integrations or Enterprise requirements.");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const a11y = (f: Field) => ({ "aria-invalid": !!errors[f], "aria-describedby": errors[f] ? `${f}-err` : undefined, style: { border: `1px solid ${errors[f] ? "#F87171" : "var(--tf-panel-border)"}` } });
  const err = (f: Field) => errors[f] && <p id={`${f}-err`} className="mt-1.5 text-[12px]" style={{ color: "#FCA5A5" }}>{errors[f]}</p>;

  // Replace the mailto with a POST to your Laravel API (e.g. /api/contact) when ready.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const found = validate(d);
    setErrors(found);
    const first = (Object.keys(found) as Field[])[0];
    if (first) { e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); return; }
    const body = `${d.get("message")}\n\nFrom: ${d.get("name")} <${d.get("email")}>`;
    window.location.href = `mailto:hello@taskflow.ai?subject=${encodeURIComponent(`TaskFlow AI: ${d.get("topic")}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <>
      <PageHero title="Talk to the TaskFlow AI team" lead="Ask about plans, integrations or Enterprise needs. We reply by email." />

      <section aria-label="Contact form" className="py-16 lg:py-24">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            {sent ? (
              <div role="status" className="rise flex flex-col items-start gap-4 rounded-2xl p-8 sm:p-10" style={PANEL}>
                <CheckCircle2 size={36} color="#2DD4BF" aria-hidden="true" />
                <h2 className="font-display text-[24px] font-semibold">Your message is ready to send</h2>
                <p className="max-w-[48ch] text-[14px] leading-relaxed" style={MUTED}>Your email app should have opened with the message filled in. If nothing opened, write to <a href="mailto:hello@taskflow.ai" className="underline underline-offset-4">hello@taskflow.ai</a>.</p>
                <button type="button" onClick={() => setSent(false)} className={`min-h-11 rounded-xl px-5 text-[14px] font-medium ${FOCUS}`} style={{ border: "1px solid var(--tf-panel-border)" }}>Write another message</button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-2xl p-6 sm:p-8" style={PANEL}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div><label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">Name</label><input id="name" name="name" autoComplete="name" className={FIELD} {...a11y("name")} />{err("name")}</div>
                  <div><label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">Work email</label><input id="email" name="email" type="email" autoComplete="email" className={FIELD} {...a11y("email")} />{err("email")}</div>
                </div>
                <div><label htmlFor="topic" className="mb-1.5 block text-[13px] font-medium">Topic</label>
                  <select id="topic" name="topic" className={FIELD} style={{ border: "1px solid var(--tf-panel-border)", background: "var(--tf-surface)" }}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div><label htmlFor="message" className="mb-1.5 block text-[13px] font-medium">How can we help?</label><textarea id="message" name="message" rows={6} className={FIELD} {...a11y("message")} />{err("message")}</div>
                <button type="submit" className={`min-h-11 rounded-xl px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 motion-reduce:transition-none sm:w-fit ${FOCUS}`} style={{ background: "var(--tf-primary)" }}>Send message</button>
              </form>
            )}
          </Reveal>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {INFO.map(({ icon: Icon, title, desc }, i) => (
                <li key={title}>
                  <Reveal delay={i * 100}>
                    <div className="lift flex gap-4 rounded-2xl p-5" style={PANEL}>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(37,99,235,0.14)" }}><Icon size={20} color="#93C5FD" aria-hidden="true" /></span>
                      <div><h2 className="text-[15px] font-semibold">{title}</h2><p className="mt-1 text-[13px] leading-relaxed" style={MUTED}>{desc}</p></div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
            <Reveal delay={300}>
              <div className="rounded-2xl p-5" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.4)" }}>
                <h2 className="mb-3 text-[15px] font-semibold">What happens next</h2>
                <ol className="m-0 flex list-none flex-col gap-3 p-0">
                  {NEXT.map((n, i) => (
                    <li key={n} className="flex items-center gap-3 text-[13px]">
                      <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white" style={{ background: "linear-gradient(135deg,#2563EB,#14B8A6)" }}>{i + 1}</span>{n}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section aria-labelledby="contact-faq" className="pb-20 lg:pb-28">
        <Container className="max-w-3xl">
          <Reveal><SectionHead id="contact-faq" title="Quick answers" lead="Your question might already be answered here." /></Reveal>
          <Reveal delay={100}><Faq items={FAQS} /></Reveal>
        </Container>
      </section>
    </>
  );
}