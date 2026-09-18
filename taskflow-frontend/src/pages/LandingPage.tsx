import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Menu,
  X,
  BrainCircuit,
  KanbanSquare,
  Users,
  BarChart3,
  Workflow,
  ChevronDown,
  Mail,
  ArrowRight,
  Check,
  FileText,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { GlassPanel, PulseCard } from "../components/ui/Primitives";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const FEATURES = [
  { icon: BrainCircuit, title: "AI Task Assistant", desc: "Ask what to work on today, which tasks are at risk, or get a plain-language project summary — on demand." },
  { icon: Workflow, title: "Smart Scheduling", desc: "AI reads deadlines and priorities across every project and recommends the order to tackle your day." },
  { icon: Users, title: "Team Collaboration", desc: "Comments, mentions, and a live activity feed keep everyone aligned without another status meeting." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Completion trends, workload balance, and project health scores, updated as work happens." },
  { icon: KanbanSquare, title: "Workflow Automation", desc: "Meeting notes become tasks automatically. Recurring work sets itself up. Risk gets flagged before it's a fire." },
];

const STEPS = [
  { n: "01", title: "Create a project", desc: "Set a goal, a deadline, and let the AI suggest a task breakdown." },
  { n: "02", title: "Add your team", desc: "Invite people, assign roles, and let workload balance itself." },
  { n: "03", title: "Generate tasks with AI", desc: "Turn a goal — or a messy meeting transcript — into a structured task list." },
  { n: "04", title: "Track progress", desc: "A live urgency map shows exactly what needs attention today." },
  { n: "05", title: "Deliver faster", desc: "Risk gets caught early. Reports write themselves. Deadlines get hit." },
];

// Real product capabilities, not fabricated customer quotes — a new product
// doesn't have testimonials yet, and inventing ones attributed to fictional
// people would be misleading on a page real visitors will actually read.
const SCENARIOS = [
  {
    icon: FileText,
    title: "Turn a messy meeting into a task list",
    desc: "Paste a transcript. The AI pulls out action items, suggests an owner for each, and drops them straight into your Backlog — in seconds, not a follow-up email.",
  },
  {
    icon: ShieldAlert,
    title: "Catch risk before it's a fire",
    desc: "Every task is scored for deadline and workload risk automatically. See what's trending toward late before it's actually late, not after.",
  },
  {
    icon: LayoutDashboard,
    title: "One view instead of five tabs",
    desc: "Tasks, calendar, team workload, and AI insights live on one Mission Control screen — no more piecing together status from three different tools.",
  },
];

const PLANS = [
  { name: "Free", price: "$0", period: "forever", features: ["Up to 3 projects", "Basic Kanban & calendar", "5 AI assistant queries/day", "1 team member"], cta: "Get started" },
  { name: "Pro", price: "$14", period: "per user/month", featured: true, features: ["Unlimited projects", "Full AI suite", "Meeting notes converter", "Risk detection & alerts", "Slack, Calendar, Outlook"], cta: "Start free trial" },
  { name: "Enterprise", price: "Custom", period: "contact us", features: ["SSO & advanced roles", "Dedicated support", "Custom integrations", "Audit logs & compliance"], cta: "Contact sales" },
];

const FAQS = [
  { q: "How does the AI task assistant actually work?", a: "It reads your project's live data — tasks, deadlines, priorities, and assignees — and answers questions like \"what should I work on today\" or \"which tasks are at risk\" using that real context, not generic advice." },
  { q: "Can I import an existing project?", a: "Yes — create a project and paste your goal and requirements into the AI Task Generation tool, and it'll draft a full task breakdown you can edit before importing." },
  { q: "Does the free plan really not expire?", a: "Correct. It's capped on projects and AI usage, not time. Upgrade only when you outgrow the limits." },
  { q: "What happens to my data if I cancel?", a: "You can export everything — tasks, reports, and files — at any point. We don't hold your data hostage." },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const staggerContainer: Variants = { visible: { transition: { staggerChildren: 0.1 } } };

function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: "rgba(5,7,12,0.7)", borderBottom: "1px solid var(--tf-panel-border)" }}>
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #2563EB, #14B8A6)" }}>
            <Sparkles size={16} color="#fff" />
          </div>
          <span className="text-[16px] font-display font-semibold" style={{ color: "var(--tf-ink)" }}>
            TaskFlow <span style={{ color: "var(--tf-teal)" }}>AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] transition-colors hover:text-white" style={{ color: "var(--tf-ink-muted)" }}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="text-[13px] font-medium" style={{ color: "var(--tf-ink-muted)" }}>
            Log in
          </Link>
          <Link to="/signup" className="px-4 py-2 rounded-xl text-white text-[13px] font-medium transition-transform hover:scale-105" style={{ background: "var(--tf-primary)", boxShadow: "0 0 16px rgba(37,99,235,0.4)" }}>
            Get started
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} aria-label="Toggle menu" className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center" style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink-muted)" }}>
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid var(--tf-panel-border)" }}
          >
            <div className="px-4 pb-4 flex flex-col gap-3">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-[14px] pt-3" style={{ color: "var(--tf-ink-muted)" }}>
                  {l.label}
                </a>
              ))}
              <Link to="/login" onClick={() => setOpen(false)} className="text-[14px] font-medium pt-1" style={{ color: "var(--tf-ink)" }}>
                Log in
              </Link>
              <Link to="/signup" onClick={() => setOpen(false)} className="text-center px-4 py-2.5 rounded-xl text-white text-[14px] font-medium" style={{ background: "var(--tf-primary)" }}>
                Get started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--tf-panel-border)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 p-4 text-left" aria-expanded={open}>
        <span className="text-[14px] font-medium" style={{ color: "var(--tf-ink)" }}>
          {q}
        </span>
        <ChevronDown size={16} className="shrink-0 transition-transform" style={{ color: "var(--tf-ink-muted)", transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div className="px-4 pb-4 text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A lightweight, stylized preview of the actual dashboard — built from the
 * app's real design tokens rather than a static screenshot, so it never
 * goes stale as the product changes. */
function HeroPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
      className="relative mx-auto mt-14 max-w-4xl"
    >
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--tf-panel-border)", background: "var(--tf-surface)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
        <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: "1px solid var(--tf-panel-border)" }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#EF4444" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#F59E0B" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22C55E" }} />
        </div>
        <div className="grid grid-cols-3 gap-3 p-4 sm:p-6">
          <div className="col-span-1 flex flex-col gap-2">
            <div className="h-3 w-16 rounded" style={{ background: "rgba(255,255,255,0.1)" }} />
            {["Mission control", "Kanban board", "Calendar", "Team"].map((label, i) => (
              <div key={label} className="h-7 rounded-lg flex items-center px-2 text-[10px]" style={{ background: i === 0 ? "rgba(37,99,235,0.18)" : "rgba(255,255,255,0.03)", color: i === 0 ? "#fff" : "var(--tf-ink-muted)" }}>
                {label}
              </div>
            ))}
          </div>
          <div className="col-span-2 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg p-2" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
                  <div className="h-1.5 w-8 rounded mb-1.5" style={{ background: "rgba(255,255,255,0.1)" }} />
                  <div className="h-2.5 w-10 rounded" style={{ background: i === 1 ? "#14B8A6" : "rgba(255,255,255,0.15)" }} />
                </div>
              ))}
            </div>
            <div className="flex-1 rounded-lg p-3 flex items-center justify-center" style={{ background: "var(--tf-panel)", border: "1px solid var(--tf-panel-border)" }}>
              <svg viewBox="0 0 160 100" className="w-full h-20">
                <circle cx="80" cy="50" r="8" fill="#14B8A6" opacity="0.5" />
                {[
                  { x: 40, y: 30, c: "#EF4444" },
                  { x: 120, y: 30, c: "#2563EB" },
                  { x: 40, y: 70, c: "#F59E0B" },
                  { x: 120, y: 70, c: "#14B8A6" },
                ].map((n, i) => (
                  <circle key={i} cx={n.x} cy={n.y} r="4" fill={n.c} />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute -inset-x-8 -bottom-8 h-24" style={{ background: "linear-gradient(to top, var(--tf-void), transparent)" }} />
    </motion.div>
  );
}

export function LandingPage() {
  return (
    <div style={{ background: "var(--tf-void)", color: "var(--tf-ink)" }}>
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px circle at 20% 0%, rgba(37,99,235,0.18), transparent 60%), radial-gradient(600px circle at 90% 30%, rgba(20,184,166,0.14), transparent 60%)",
            opacity: "var(--tf-aurora-opacity)",
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-6"
            style={{ background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.3)" }}
          >
            <Sparkles size={12} color="#14B8A6" />
            <span className="text-[11px] font-mono tracking-wide" style={{ color: "#5EEAD4" }}>
              AI-POWERED PRODUCTIVITY
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-[32px] sm:text-[48px] leading-tight font-display font-semibold mb-5"
          >
            Manage Tasks Smarter <br className="hidden sm:block" />
            with <span style={{ background: "linear-gradient(135deg, #2563EB, #14B8A6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI-Powered</span> Productivity
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[15px] sm:text-[17px] max-w-xl mx-auto mb-8"
            style={{ color: "var(--tf-ink-muted)" }}
          >
            Plan projects, automate workflows, collaborate with teams, and let AI help you achieve more.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to="/signup" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white text-[14px] font-medium transition-transform hover:scale-105" style={{ background: "var(--tf-primary)", boxShadow: "0 0 24px rgba(37,99,235,0.5)" }}>
              Get Started <ArrowRight size={15} />
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-colors hover:bg-white/5" style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}>
              See how it works
            </a>
          </motion.div>

          <HeroPreview />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5 }}>
          <h2 className="text-[26px] sm:text-[32px] font-display font-semibold mb-3">Built for how teams actually work</h2>
          <p className="text-[14px] max-w-xl mx-auto" style={{ color: "var(--tf-ink-muted)" }}>
            Every feature is designed to remove a step, not add one.
          </p>
        </motion.div>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
        >
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={fadeUp}>
                <GlassPanel className="p-5 h-full transition-transform hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(37,99,235,0.12)" }}>
                    <Icon size={18} color="#93C5FD" />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-1.5">{f.title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>
                    {f.desc}
                  </p>
                </GlassPanel>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-[26px] sm:text-[32px] font-display font-semibold mb-3">How it works</h2>
          <p className="text-[14px]" style={{ color: "var(--tf-ink-muted)" }}>
            From a blank project to a finished sprint, in five steps.
          </p>
        </motion.div>

        <div className="relative">
          <motion.div
            className="hidden lg:block absolute top-[15px] left-[10%] right-[10%] h-px origin-left"
            style={{ background: "linear-gradient(90deg, rgba(37,99,235,0.4), rgba(20,184,166,0.4))" }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          <motion.div
            className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
          >
            {STEPS.map((s) => (
              <motion.div key={s.n} className="text-center sm:text-left" variants={fadeUp}>
                <motion.div
                  className="inline-block text-[24px] font-display font-semibold mb-2 rounded-full"
                  style={{ color: "rgba(255,255,255,0.2)" }}
                  whileHover={{ scale: 1.15, color: "#14B8A6" }}
                  transition={{ duration: 0.2 }}
                >
                  {s.n}
                </motion.div>
                <h3 className="text-[14px] font-semibold mb-1">{s.title}</h3>
                <p className="text-[12px] leading-relaxed" style={{ color: "var(--tf-ink-muted)" }}>
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Product scenarios — honest capability showcase, not fabricated testimonials */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5 }}>
          <h2 className="text-[26px] sm:text-[32px] font-display font-semibold mb-3">See it in action</h2>
          <p className="text-[14px] max-w-xl mx-auto" style={{ color: "var(--tf-ink-muted)" }}>
            Three real ways teams use TaskFlow AI every day.
          </p>
        </motion.div>
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}>
          {SCENARIOS.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.title} variants={fadeUp}>
                <PulseCard className="h-full">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(20,184,166,0.12)" }}>
                    <Icon size={18} color="#5EEAD4" />
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2" style={{ color: "var(--tf-ink)" }}>
                    {s.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "#C7D2E3" }}>
                    {s.desc}
                  </p>
                </PulseCard>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5 }}>
          <h2 className="text-[26px] sm:text-[32px] font-display font-semibold mb-3">Simple, honest pricing</h2>
          <p className="text-[14px]" style={{ color: "var(--tf-ink-muted)" }}>
            Start free. Upgrade only when you need to.
          </p>
        </motion.div>
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}>
          {PLANS.map((p) => (
            <motion.div
              key={p.name}
              variants={fadeUp}
              className="rounded-2xl p-6 relative transition-transform hover:-translate-y-1"
              style={{
                background: p.featured ? "rgba(37,99,235,0.08)" : "var(--tf-panel)",
                border: p.featured ? "1px solid rgba(37,99,235,0.4)" : "1px solid var(--tf-panel-border)",
              }}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono px-2 py-1 rounded-full text-white" style={{ background: "var(--tf-primary)" }}>
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-[15px] font-semibold mb-1">{p.name}</h3>
              <div className="mb-4">
                <span className="text-[28px] font-display font-semibold">{p.price}</span>
                <span className="text-[12px] ml-1" style={{ color: "var(--tf-ink-muted)" }}>
                  {p.period}
                </span>
              </div>
              <ul className="flex flex-col gap-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: "#C7D2E3" }}>
                    <Check size={14} className="mt-0.5 shrink-0" color="#14B8A6" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="block text-center py-2.5 rounded-xl text-[13px] font-medium transition-opacity hover:opacity-90"
                style={p.featured ? { background: "var(--tf-primary)", color: "white" } : { border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}
              >
                {p.cta}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5 }}>
          <h2 className="text-[26px] sm:text-[32px] font-display font-semibold mb-3">Frequently asked questions</h2>
        </motion.div>
        <motion.div className="flex flex-col gap-3" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer}>
          {FAQS.map((f) => (
            <motion.div key={f.q} variants={fadeUp}>
              <FaqItem q={f.q} a={f.a} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Contact / CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.5 }}>
          <GlassPanel className="p-8 sm:p-12">
            <h2 className="text-[24px] sm:text-[28px] font-display font-semibold mb-3">Ready to plan smarter?</h2>
            <p className="text-[14px] mb-6" style={{ color: "var(--tf-ink-muted)" }}>
              Get started free — no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup" className="w-full sm:w-auto px-6 py-3 rounded-xl text-white text-[14px] font-medium transition-transform hover:scale-105" style={{ background: "var(--tf-primary)", boxShadow: "0 0 24px rgba(37,99,235,0.5)" }}>
                Get Started
              </Link>
              <a href="mailto:hello@taskflow.ai" className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-colors hover:bg-white/5" style={{ border: "1px solid var(--tf-panel-border)", color: "var(--tf-ink)" }}>
                <Mail size={15} /> Contact sales
              </a>
            </div>
          </GlassPanel>
        </motion.div>
      </section>

      <footer className="border-t py-8" style={{ borderColor: "var(--tf-panel-border)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]" style={{ color: "var(--tf-ink-muted)" }}>
          <span>© 2026 TaskFlow AI. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="mailto:hello@taskflow.ai" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
