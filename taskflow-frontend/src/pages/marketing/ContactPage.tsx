import { useState, type FormEvent } from "react";
import { Container, SectionHead } from "../../components/marketing/Bits";
import { usePageMeta } from "../../hooks/usePageMeta";

const FIELD = "min-h-11 w-full rounded-xl bg-transparent px-3 py-2 text-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tf-teal)]";
const BORDER = { border: "1px solid var(--tf-panel-border)" };

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
    <Container className="max-w-xl py-16 lg:py-24">
      <SectionHead title="Talk to us" lead="Ask about plans, integrations or Enterprise needs. We reply by email." />
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div><label htmlFor="name" className="mb-1.5 block text-[13px] font-medium">Name</label>
          <input id="name" name="name" required autoComplete="name" className={FIELD} style={BORDER} /></div>
        <div><label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">Work email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={FIELD} style={BORDER} /></div>
        <div><label htmlFor="message" className="mb-1.5 block text-[13px] font-medium">How can we help?</label>
          <textarea id="message" name="message" required rows={5} className={FIELD} style={BORDER} /></div>
        <button type="submit" className="min-h-11 rounded-xl px-6 text-[14px] font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tf-teal)]" style={{ background: "var(--tf-primary)" }}>Send message</button>
        <p role="status" className="min-h-5 text-[13px]" style={{ color: "var(--tf-teal)" }}>{sent ? "Your email app should open with the message ready to send." : ""}</p>
      </form>
    </Container>
  );
}
