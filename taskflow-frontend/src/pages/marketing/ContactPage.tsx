import { useState, type FormEvent } from "react";
import { Mail, Briefcase, LifeBuoy } from "lucide-react";
import { Container } from "../../components/marketing/Bits";
import { Reveal } from "../../components/marketing/Reveal";
import { PageHero } from "../../components/marketing/PageHero";
import { usePageMeta } from "../../hooks/usePageMeta";

const FIELD = "min-h-11 w-full rounded-xl bg-transparent px-3.5 py-2.5 text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tf-teal)] motion-reduce:transition-none";
const BORDER = { border: "1px solid var(--tf-panel-border)" };
const INFO = [
  { icon: Briefcase, title: "Sales and Enterprise", desc: "Plans, SSO, custom integrations and security questions." },
  { icon: LifeBuoy, title: "Help with your account", desc: "Something not working? Tell us what you saw and we'll dig in." },
  { icon: Mail, title: "Email us directly", desc: "hello@taskflow.ai" },
];

export function ContactPage() {
  usePageMeta("Contact", "Talk to the TaskFlow AI team about plans, integrations or Enterprise requirements.");
  const [sent, setSent] = useState(false);

  // Replace with a POST to your Laravel API (e.g. /api/contact) when ready.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const body = `${d.get("message")}\n\nFrom: ${d.get("name")} <${d.get("email")}>`;
    window.location.href = `mailto:hello@taskflow.ai?subject=${encodeURIComponent("TaskFlow AI enquiry")}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <>
      <PageHero title="Talk to the TaskFlow AI team" lead="Ask about plans, integrations or Enterprise needs. We reply by email." />
      <section aria-label="Contact form" className="py-16 lg:py-24">
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <Reveal className="lg:col-span-7">
            <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-2xl p-6 sm:p-8" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">Name</label><input id="name" name="name" required autoComplete="name" className={FIELD} style={BORDER} /></div>
                <div><label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">Work email</label><input id="email" name="email" type="email" required autoComplete="email" className={FIELD} style={BORDER} /></div>
              </div>
              <div><label htmlFor="message" className="mb-1.5 block text-[13px] font-medium">How can we help?</label><textarea id="message" name="message" required rows={6} className={FIELD} style={BORDER} /></div>
              <button type="submit" className="min-h-11 rounded-xl px-6 text-[14px] font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tf-teal)] motion-reduce:transition-none sm:w-fit" style={{ background: "var(--tf-primary)" }}>Send message</button>
              <p role="status" className="min-h-5 text-[13px]" style={{ color: "var(--tf-teal)" }}>{sent ? "Your email app should open with the message ready to send." : ""}</p>
            </form>
          </Reveal>
          <ul className="m-0 flex list-none flex-col gap-4 p-0 lg:col-span-5">
            {INFO.map(({ icon: Icon, title, desc }, i) => (
              <li key={title}>
                <Reveal delay={i * 100}>
                  <div className="lift flex gap-4 rounded-2xl p-5" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(37,99,235,0.14)" }}><Icon size={20} color="#93C5FD" aria-hidden="true" /></span>
                    <div><h2 className="text-[15px] font-semibold">{title}</h2><p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>{desc}</p></div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}