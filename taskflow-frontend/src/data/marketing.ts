import { BrainCircuit, Workflow, Users, BarChart3, KanbanSquare, Plug, FileText, ShieldAlert, LayoutDashboard, MessageSquare, CalendarDays, Mail, Download, UploadCloud, Sparkles, UserCheck, type LucideIcon } from "lucide-react";

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
  { icon: KanbanSquare, title: "Workflow automation", desc: "Upload a plan and watch it become assigned tasks. Meeting notes become tasks. Recurring work sets itself up." },
  { icon: Plug, title: "Integrations", desc: "Connect Slack, Calendar and Outlook so tasks and deadlines show up where you already work." },
];

export const INTEGRATIONS: { icon: LucideIcon; name: string; desc: string }[] = [
  { icon: MessageSquare, name: "Slack", desc: "Alerts and updates in your channels" },
  { icon: CalendarDays, name: "Google Calendar", desc: "Deadlines on your calendar" },
  { icon: Mail, name: "Outlook", desc: "Tasks alongside your inbox" },
  { icon: FileText, name: "Meeting transcripts", desc: "Paste notes, get tasks" },
  { icon: Download, name: "CSV export", desc: "Take your data anywhere" },
];

export const HOW_IT_WORKS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: UploadCloud, title: "Upload your plan", desc: "Drop in a PDF, Word doc or plain-text file. If it has goals or action items, it works." },
  { icon: Sparkles, title: "AI drafts the tasks", desc: "Every item gets a title, a priority, a due date and a suggested owner from your team's job titles." },
  { icon: UserCheck, title: "Your team gets assigned", desc: "Review the list, fix anything in one click, and send it all to the Kanban board." },
];

export const ROLES: { title: string; desc: string }[] = [
  { title: "Designers", desc: "Mockups land on your plate automatically — no more digging through meeting notes to find what you owe." },
  { title: "Accountants", desc: "Month-end checklists build themselves from last month's plan, with due dates already attached." },
  { title: "Developers", desc: "Specs turn into scoped tickets with dependencies linked, so you start coding instead of clarifying." },
  { title: "Project managers", desc: "One upload becomes a staffed, dated board. You review instead of transcribing." },
];

export const TESTIMONIALS: { quote: string; name: string; role: string }[] = [
  { quote: "We uploaded our launch plan on Monday morning. By lunch, forty tasks were assigned and dated.", name: "Sample Customer", role: "Operations lead (placeholder)" },
  { quote: "The risk view caught a slipping deadline two weeks before we would have noticed.", name: "Sample Customer", role: "Project manager (placeholder)" },
  { quote: "Our designers finally see only their own work, without anyone forwarding threads.", name: "Sample Customer", role: "Design lead (placeholder)" },
];

export const SCENARIOS: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: FileText, title: "Turn a meeting into a task list", desc: "Paste a transcript. The AI pulls out action items, suggests an owner for each and drops them into your Backlog." },
  { icon: ShieldAlert, title: "Catch risk before it's late", desc: "Every task is scored for deadline and workload risk, so you see what's trending late before it is." },
  { icon: LayoutDashboard, title: "One screen, not five tabs", desc: "Tasks, calendar, team workload and AI insights live together on Mission Control." },
];

export const PLANS = [
  { name: "Free", tagline: "For trying it on a real project", price: "$0", period: "forever", features: ["Up to 3 projects", "Basic Kanban and calendar", "50 AI messages a month", "3 team seats"], cta: "Start free", featured: false },
  { name: "Pro", tagline: "For teams that ship every week", price: "$14", period: "per user / month", features: ["Up to 25 projects", "Full AI suite", "Meeting notes converter", "Risk detection and alerts", "Slack, Calendar, Outlook"], cta: "Start free trial", featured: true },
  { name: "Enterprise", tagline: "For organizations with security needs", price: "Custom", period: "talk to us", features: ["SSO and advanced roles", "Dedicated support", "Custom integrations", "Audit logs and compliance"], cta: "Contact sales", featured: false },
];

export const FAQS = [
  { q: "How does the AI assistant work?", a: "It reads your project's live data (tasks, deadlines, priorities and assignees) and answers questions like \"what should I work on today?\" using that context, not generic advice." },
  { q: "Can I import an existing project?", a: "Yes. Create a project, paste your goal and requirements into AI Task Generation, and edit the drafted breakdown before you import it." },
  { q: "Does the free plan expire?", a: "No. It's capped on projects and AI usage, not time. Upgrade when you outgrow the limits." },
  { q: "What happens to my data if I cancel?", a: "You can export your tasks, reports and files at any time." },
  { q: "What happens when I hit a limit?", a: "The app tells you exactly which limit you hit — members, projects, plan imports or AI messages — with a link to upgrade. Nothing breaks; you just can't add more until you upgrade." },
  { q: "How do I pay or cancel?", a: "Checkout and invoices run through Stripe. Manage or cancel anytime from the billing page; canceling keeps your plan until the end of the billing period, then drops you to Free." },
];