import { BrainCircuit, Workflow, Users, BarChart3, KanbanSquare, Plug, FileText, ShieldAlert, LayoutDashboard, MessageSquare, CalendarDays, Mail, Download, type LucideIcon } from "lucide-react";

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: BrainCircuit, title: "Ask your projects", desc: "Ask what to work on today or which tasks are at risk. Answers come from your live tasks, deadlines and assignees." },
  { icon: Workflow, title: "Smart scheduling", desc: "AI reads deadlines and priorities across every project and suggests the order to tackle your day." },
  { icon: Users, title: "Team collaboration", desc: "Comments, mentions and a live activity feed keep everyone aligned without another status meeting." },
  { icon: BarChart3, title: "Analytics dashboard", desc: "Completion trends, workload balance and project health, updated as work happens." },
  { icon: KanbanSquare, title: "Workflow automation", desc: "Meeting notes become tasks. Recurring work sets itself up. Risk is flagged before it's late." },
  { icon: Plug, title: "Integrations", desc: "Connect Slack, Calendar and Outlook so tasks and deadlines show up where you already work." },
];

export const INTEGRATIONS: { icon: LucideIcon; name: string; desc: string }[] = [
  { icon: MessageSquare, name: "Slack", desc: "Alerts and updates in your channels" },
  { icon: CalendarDays, name: "Google Calendar", desc: "Deadlines on your calendar" },
  { icon: Mail, name: "Outlook", desc: "Tasks alongside your inbox" },
  { icon: FileText, name: "Meeting transcripts", desc: "Paste notes, get tasks" },
  { icon: Download, name: "CSV export", desc: "Take your data anywhere" },
];

export const STEPS = [
  { title: "Create a project", desc: "Set a goal and a deadline. The AI suggests a task breakdown." },
  { title: "Add your team", desc: "Invite people, assign roles and see workload balance out." },
  { title: "Generate tasks", desc: "Turn a goal or a messy meeting transcript into a structured list." },
  { title: "Track progress", desc: "A live urgency view shows what needs attention today." },
  { title: "Deliver on time", desc: "Risk is caught early and reports write themselves." },
];

export const SCENARIOS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: FileText, title: "Turn a meeting into a task list", desc: "Paste a transcript. The AI pulls out action items, suggests an owner for each and drops them into your Backlog." },
  { icon: ShieldAlert, title: "Catch risk before it's late", desc: "Every task is scored for deadline and workload risk, so you see what's trending late before it is." },
  { icon: LayoutDashboard, title: "One screen, not five tabs", desc: "Tasks, calendar, team workload and AI insights live together on Mission Control." },
];

export const PLANS = [
  { name: "Free", tagline: "For trying it on a real project", price: "$0", period: "forever", features: ["Up to 3 projects", "Basic Kanban and calendar", "5 AI queries per day", "1 team member"], cta: "Start free", featured: false },
  { name: "Pro", tagline: "For teams that ship every week", price: "$14", period: "per user / month", features: ["Unlimited projects", "Full AI suite", "Meeting notes converter", "Risk detection and alerts", "Slack, Calendar, Outlook"], cta: "Start free trial", featured: true },
  { name: "Enterprise", tagline: "For organizations with security needs", price: "Custom", period: "talk to us", features: ["SSO and advanced roles", "Dedicated support", "Custom integrations", "Audit logs and compliance"], cta: "Contact sales", featured: false },
];

export const FAQS = [
  { q: "How does the AI assistant work?", a: "It reads your project's live data (tasks, deadlines, priorities and assignees) and answers questions like \"what should I work on today?\" using that context, not generic advice." },
  { q: "Can I import an existing project?", a: "Yes. Create a project, paste your goal and requirements into AI Task Generation, and edit the drafted breakdown before you import it." },
  { q: "Does the free plan expire?", a: "No. It's capped on projects and AI usage, not time. Upgrade when you outgrow the limits." },
  { q: "What happens to my data if I cancel?", a: "You can export your tasks, reports and files at any time." },
];