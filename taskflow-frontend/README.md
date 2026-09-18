# TaskFlow AI — Frontend

A real React + TypeScript + Tailwind CSS v4 project (Vite-powered) — not a single-file prototype. This is meant to be unzipped and run.

## What's in here

- **Public landing page** (`/`) — hero, features, how-it-works, testimonials, pricing, FAQ
- **Login & signup** (`/login`, `/signup`) — call your real Laravel backend's `/api/login` and `/api/register`
- **Dashboard** (`/dashboard/*`, behind a login guard) — Mission control, Kanban, Calendar, Meeting notes, Team, Reports, Settings
- Fully responsive: mobile drawer sidebar, no fixed layouts that break on small screens
- Verified: this project **type-checks, lints (0 warnings via oxlint), and builds with zero errors** — I ran all three before handing it to you.

## 1. Install and run

```bash
npm install
cp .env.example .env
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

## 2. Point it at your backend

`.env` has one variable:

```
VITE_API_URL=http://localhost:8000/api
```

This should match wherever `php artisan serve` is running for your `taskflow-api` project. If you change it, restart `npm run dev` (Vite only reads `.env` on startup).

## 3. Try the real login flow

With your Laravel backend running and migrated/seeded (see the backend README), go to `/login` and either:
- Click **"Use demo admin account"** to autofill `admin@taskflow.ai` / `password`, or
- Sign up a new account at `/signup`

Both actually hit your API — if the backend isn't running, you'll see a real error message ("Couldn't reach the API...") instead of a silent failure.

## What's real vs. what's still mock data

Being upfront about this so nothing surprises you:

| Feature | Status |
|---|---|
| Login / Signup | **Real** — calls your Laravel API, stores the token, persists your session on refresh |
| Logout | **Real** — calls `/api/logout` and clears the session |
| Reports → Export buttons | **Real** — link directly to your backend's PDF/Excel/CSV export endpoints |
| Settings → Slack connect | **Real** — calls `POST /api/teams/1/integrations/slack` (assumes team ID 1 from the seed data) |
| Dashboard, Kanban, Calendar, Team, Meeting notes | **Mock data** — lives in `src/data/mockData.ts`, with comments marking which backend endpoint each section maps to |

The mock data isn't a cop-out — every backend endpoint it should eventually call already exists in the `taskflow-api-backend` project from earlier (`/api/tasks`, `/api/teams/{team}`, `/api/reports/*`, `/api/ai/*`). Wiring each page to fetch real data is a contained, page-by-page job now that the shapes match. Ask me to wire up any specific page and I'll do that one properly, tested against what the API actually returns, rather than guessing at all of them at once.

## Project structure

```
src/
  types/           TypeScript types shared across the app
  lib/api.ts       fetch wrapper — auth header, error handling
  data/mockData.ts demo data (see table above)
  context/         AuthContext (real), TasksContext (shared Kanban/Dashboard state)
  components/
    ui/            GlassPanel, Modal, Avatar, PriorityBadge, etc.
    layout/        Sidebar, DashboardLayout, ProtectedRoute
    dashboard/     MissionOrbit, NewTaskModal
    kanban/        KanbanBoard
    calendar/      CalendarView
    meeting-notes/ MeetingNotesConverter
  pages/
    LandingPage.tsx, LoginPage.tsx, SignupPage.tsx
    dashboard/     DashboardHome, KanbanPage, CalendarPage, MeetingNotesPage,
                   TeamPage, ReportsPage, SettingsPage
```

## Design decisions carried over from the prototype

- Dark "mission control" theme with glass panels, not flat cards — matches the brand's blue/teal/amber/red palette functionally (priority, status), not decoratively
- **Mission Orbit** (dashboard home): tasks placed on rings by priority/urgency around a pulsing "AI core" — the one deliberately bold visual element
- Space Grotesk (headings) / Inter (body) / JetBrains Mono (data, timestamps)

## Phase 1: Foundation (component library, command palette)

This is the first of several planned phases toward the full "premium AI productivity platform" redesign brief. It's deliberately scoped — see the message where this was proposed for why building everything in one pass would produce shallow results instead of solid ones.

**Note:** an earlier version of this phase included a dark/light theme toggle. It was removed at the client's request — the app is single-theme (dark "mission control") by design now. The CSS custom property structure it left behind (`--tf-surface`, `--tf-overlay`, etc. in `index.css`) is still there and still worth keeping, since it's what let hardcoded colors get consolidated into one place — it's just no longer switched at runtime.

### Component library (`src/components/ui/`)

| Component | Purpose |
|---|---|
| `Button` | Single source of truth for button styling — 5 variants (primary, teal, secondary, ghost, danger), loading state, icon support. Applied to primary CTAs and forms (auth, modals, invite, settings) — icon-only utility buttons (close, chevron, menu) intentionally left as plain buttons since they don't share this visual language |
| `Badge` | Generic color-based badge; `PriorityBadge` is now a thin wrapper over it |
| `CircularGauge` | Reusable SVG progress ring — powers the AI productivity score, completion rate, and project health score on the dashboard (Phase 2) |
| `Skeleton` | Shimmering loading placeholder, with `SkeletonStatCard`/`SkeletonCard` presets — **not wired into any page yet**, since there's no real async loading to justify it (see the mock-data table above). Gets used for real once a page fetches real data |
| `Tooltip` | Lightweight hover/focus tooltip |

### Command palette (⌘K / Ctrl+K)

- `src/components/command-palette/CommandPalette.tsx`, triggered by a new `useKeyboardShortcut` hook (`src/hooks/`)
- Fuzzy-filters by label + keywords, full keyboard navigation (↑/↓/Enter/Esc), grouped into Navigate / Actions
- Actions include: create new task, log out
- The dashboard top bar's search field was previously decorative (did nothing) — it's now the visible trigger for the same palette, matching the Linear/Vercel pattern where search *is* the command interface

## Phase 2: Dashboard redesign — Mission Control

The dashboard (`src/pages/dashboard/DashboardHome.tsx`) was rebuilt around the "Mission Control" identity the nav item already used, rather than being a generic stat-card grid with a radar chart bolted on.

**Hero section:**
- Personalized greeting (derived from the logged-in user's name + time of day) and a live system-status pill ("All systems nominal" vs. "N items need attention" — computed from real at-risk task count, not hardcoded)
- An AI recommendation banner — a single proactive suggestion, distinct from the on-demand insights list below it
- AI productivity score as a circular gauge, plus today's progress and pending/completed counts

**Smart analytics grid** — six compact cards: completion rate, project health, and team efficiency as gauges (all computed live from the shared task list — assign, complete, or create a task and these recalculate), plus focus time, at-risk count, and total tasks.

**Charts row:** the existing weekly performance trend, plus a new burn-down chart (ideal vs. actual remaining work across the week) using Recharts' `LineChart`.

**Mission Orbit + AI Insights** carry over unchanged from before — they were already a strong, working centerpiece.

**Bottom row:** workload distribution, recent activity, and a new upcoming-deadlines card (this existed in the original single-file prototype but had been dropped in the React rewrite — it's back).

### What's genuinely computed vs. what's still illustrative

Being precise about this, since it matters:

| Metric | Source |
|---|---|
| Completion rate, project health, team efficiency, pending/completed counts, at-risk count, today's progress | **Computed live** from `TasksContext` — real derived math, not fabricated |
| AI productivity score (84%), weekly trend, burn-down data, focus time, AI recommendation text, AI insights list | **Illustrative demo data** in `mockData.ts`, each documented with a comment naming the backend endpoint it should eventually call (same convention as the rest of this file) |

### What's next

Phases 3–6 (Kanban overhaul, Calendar overhaul, Team workspace, AI surfaces) are still ahead.

## Mission Orbit redesign + dashboard typography fix

Two problems were flagged with the first Mission Control build:

**"Mission Orbit isn't user-friendly."** Fair — a radar of unlabeled dots that only reveals a task's identity on click isn't scannable. Fixed by pairing it with a new `UrgencyList` component (`src/components/dashboard/UrgencyList.tsx`): the orbit is now smaller and quieter (no on-canvas text labels, since `PriorityLegend` already explains the colors), and sits next to a real, sortable list of the same tasks — title, project, due date, assignee, priority badge, all readable without clicking anything. Hover or click either the orbit or the list and both stay in sync (shared `selectedId`/`hoveredId` state). The radar still gives the "AI is watching everything" shape at a glance; the list is what you'd actually use to find and act on a task.

**Font size/family inconsistency.** The dashboard had accumulated one-off sizes (`text-[11px]`, `text-[12px]`, `text-[12.5px]`, `text-[13px]`, `text-[14px]`, `text-[15px]`, `text-[16px]`...) with no real hierarchy logic. Replaced with a fixed three-tier scale using Tailwind's standard steps: `text-xl`/`text-2xl` + `font-display` for the hero and top-level headers, `text-base`/`text-sm` + `font-display` for panel/section headers, `text-sm` for body copy, and `text-xs font-mono` for meta/data (timestamps, due dates, percentages). The `text-[10px]` uppercase-tracking micro-labels (`Eyebrow`, gauge sublabels) are kept as their own intentional smallest tier, matching common premium-SaaS conventions rather than being an inconsistency.

## Phase 3: Kanban board overhaul

`Task` gained three optional fields — `description`, `labels`, `checklist` — and `TasksContext` gained `updateTask`/`deleteTask` alongside the existing `addTask`/`moveTask`.

**Cards now show:**
- A description snippet (2-line clamp) when present
- Label chips (reusing the `Badge` component)
- A checklist progress bar (`done/total`) when present
- A distinct AI-risk indicator (pulsing sparkle icon) separate from the priority badge — priority is a static classification, "at risk" is the AI's live judgment call, so they're visually different
- Hover elevation (subtle lift + the quick-actions menu fading in)
- Drag feedback — the source card dims to 40% opacity while being dragged, instead of no visual acknowledgment at all

**Quick actions (`DropdownMenu`, a new generic reusable context-menu component):** every card has a kebab menu with Edit, Move to (lists every other column), and Delete — this is also the keyboard-accessible path to reordering a card without drag-and-drop, since drag-and-drop alone excludes keyboard/screen-reader users.

**Clicking a card** (not dragging it) opens `TaskDetailModal` — the "expandable task details" from the brief: editable title, description, priority, column, assignee, and due date, plus a delete button, all writing back through `TasksContext.updateTask`.

**Columns now have:** a sticky header (stays visible while the column's own content scrolls, using its own `max-h` + `overflow-y-auto` independent of the board's horizontal scroll), a critical-count badge alongside the total count, and a real empty state (icon + "No tasks yet") instead of just blank space.

**Deliberately not built:** infinite scroll (the brief said "if needed" — the dataset is small enough that it isn't), and loading skeletons (same reasoning as `Skeleton` elsewhere: there's no real async fetch yet to justify one, and faking a timeout was already flagged as unwelcome behavior in this app).

## Phase 4: Calendar overhaul

The calendar was a single Month-grid component before. It's now four real views sharing one data model, plus a genuinely computed AI scheduling panel — not four mockups of the same static data.

**Data model:** `Meeting` (title, day, start hour, duration, priority, attendees) replaces the old flat `CalendarEvent`. Meetings live in `mockData.ts` as before (documented, not hidden). **Deadlines are new and are not mock data** — they're derived live from `TasksContext` in `CalendarPage.tsx` by parsing each task's `due` field ("Jul 4" → day 4). Change a task's due date in Kanban and it moves on the calendar too, the same cross-feature wiring pattern as the Dashboard's Mission Orbit.

**Four views** (`CalendarViewTabs`, switchable by click or keyboard `1`–`4`):
- **Month** — the original grid, now with working Prev/Next navigation across June/July/August 2026 (months outside the demo range show an honest empty state rather than pretending to have data)
- **Week** / **Day** — share one `TimeGrid` component: hourly rows, sticky time-label column, meeting blocks positioned by time, a real current-time indicator (uses your actual system clock's hour/minute, mapped onto the app's fixed "today" of July 2, 2026)
- **Agenda** — flat chronological list grouped by day, the most accessible view of the four

**Drag, drop, and resize are functional, not decorative:** drag a meeting block onto a different day/hour cell to move it (native HTML5 drag-and-drop, snaps to the hour); drag the thin handle at the bottom edge of a block to resize its duration (mouse-tracked, whole-hour increments, 1–8 hour range). Both write back through local state in `CalendarPage`, and clicking a meeting opens `MeetingDetailModal` for direct editing (title, day, time, duration, priority, attendee toggles) or deletion.

**AI scheduling panel (`AiSchedulingPanel`)** — every number in it is computed from the actual meeting list for the selected day, via pure functions in `src/lib/calendar.ts`:
- **Conflict detection** — `detectConflicts()` checks every meeting pair for overlapping day/time ranges. The demo data includes one intentional conflict (Daniel Cruz double-booked on July 3rd) so you can see it flagged with a warning icon and red outline in both Week/Day and Agenda views
- **Suggested focus blocks** — `findFocusBlocks()` finds gaps of 2+ hours between meetings during working hours (9am–6pm)
- **Best times for the whole team** — `findBestMeetingTimes()` finds hours where none of the four team members have a conflicting meeting

The one line of genuinely illustrative text is `AI_SCHEDULING_RECOMMENDATION` in `mockData.ts` — a single proactive suggestion, documented the same way as the dashboard's equivalent.

**Keyboard shortcuts:** `1`–`4` switch views, `←`/`→` move the selected day, `T` jumps back to today — all via the `useKeyboardShortcut` hook from Phase 1, shown as a hint line above the calendar.

**Deliberately not built:** true drag-to-create (dragging across empty cells to create a new meeting) and multi-day event spanning — both are real Google-Calendar-level features that would need more interaction-design decisions than fit in this phase. Ask for either specifically if you want them next.

## Phase 5: Team workspace

`Person` gained `department` and `status` (online/away/offline — illustrative presence, documented as such). A new `MeetingsContext` was introduced, lifting meeting state out of `CalendarPage` so edits made there (drag, resize, delete) persist and are visible from Team too — the same architectural pattern as `TasksContext`.

**What's genuinely computed vs. illustrative**, since that distinction has mattered throughout this project:

| Feature | Source |
|---|---|
| Member availability ("In a meeting until 3pm" / "Available now") | **Real** — `isPersonBusyNow()`/`nextFreeHour()` in `src/lib/calendar.ts` check the actual shared meeting list against the current wall-clock hour |
| AI workload recommendation | **Real** — computed from the actual spread between the busiest and least-busy person's workload, and that person's actual Backlog tasks; the panel renders nothing at all if the team is already balanced within 20 points, rather than manufacturing advice |
| Shared projects list | **Real** — derived from the live task list's `project` field, not a separate hardcoded list that could drift out of sync |
| Shared calendar preview | **Real** — reads the same `MeetingsContext` the Calendar page edits |
| Search and department filtering | **Real** — functional filtering over whatever member data exists, mock or not |
| Team achievements | **Mixed** — the tasks-shipped count and at-risk count are computed from real state; the "4-day completion streak" badge is labeled illustrative in the panel itself, since there's no streak-tracking data source to compute it from |
| Online/away/offline status, collaboration timeline comments | **Illustrative** — no presence or comments backend exists yet; documented in `mockData.ts` the same way as every other demo field in this file |

**Member cards** show a status dot, department badge, live availability, a workload gauge (reusing `CircularGauge` from Phase 2), and task completion count — with a kebab menu for removal.

**Deliberately not built:** a full member profile modal (clicking a card doesn't expand to a dedicated page) and department management (departments come from whatever string is typed on invite — there's no admin screen for renaming/merging them). Both are reasonable next steps if you want the workspace to go further.

## Phase 6: AI surfaces

This phase touches every "AI" feature named in the brief — and for each one, the README states plainly whether it's real computation or a rule-based stand-in, since that distinction has mattered throughout this project and matters most here.

**AI Assistant, now answering for real.** The Dashboard's chat previously returned three fixed canned strings regardless of what you typed. `src/lib/aiAssistant.ts` replaces that with `answerQuestion()`, which pattern-matches your question (today / risk / meetings / progress) and computes the answer from the actual shared `TasksContext` and `MeetingsContext` — ask "what's due today" after creating a task due today and it appears in the answer. This is keyword routing to real computation, not a language model; genuinely open-ended understanding would call the OpenAI-backed `/api/ai/ask` endpoint already built in the `taskflow-api` backend.

**Daily briefing** (`DailyBriefingModal`, new) — accessible via the sparkle icon in the top bar or the ⌘K palette. Assembles tasks due today, at-risk items, today's meetings, and a computed focus-block suggestion (reusing `findFocusBlocks` from Phase 4) into one screen. Every line is derived at render time; nothing is a stored paragraph.

**Natural-language task creation** (`QuickAddBar`, new, on the Kanban page) — type `"fix login bug tomorrow, critical"` and watch it parse live into title/priority/due-date/labels before you submit. `src/lib/nlp.ts` is a deterministic keyword parser (regex-based), documented in its own file header as intentionally not an LLM call — this kind of structured extraction is a task regex genuinely handles well, so pretending it needs AI would be dishonest, not impressive.

**AI-assisted task creation** (`NewTaskModal` enhancements) — as you type a title, label suggestions appear based on keyword matching (shares the same logic as the quick-add parser via `suggestLabels()`); a "Draft with AI" button fills the description field from a template. The button's tooltip and the code's own comment both say plainly that this is a heuristic, not a real generation call — the real version is `POST /api/ai/generate-tasks` in the backend, already built and waiting to be wired in.

**AI-powered search** (Command Palette extended) — typing in ⌘K now also searches live task and meeting titles, not just static navigation commands, surfacing them in their own grouped sections. It's substring matching against real data, not semantic/embedding search — labeled as such in the component's own header comment.

**Smart notifications extended** — `NotificationsContext` now also watches `MeetingsContext` via `detectConflicts()` (from Phase 4) and fires a real notification the moment two meetings start overlapping, on top of the existing task-created/completed/at-risk notifications from Phase 1.

### The honesty table, one more time

| Feature | What it actually is |
|---|---|
| AI Assistant answers | Keyword-routed, but the numbers/names in the answer are real computed data |
| Daily briefing | 100% computed from live tasks + meetings |
| Natural-language quick-add | Real deterministic regex parser — genuinely does what it claims |
| AI-drafted description | Template heuristic, explicitly labeled, not a real generation call |
| Command palette task/meeting search | Real substring search against live data, not semantic search |
| Meeting-conflict notifications | Real — reuses Phase 4's actual conflict-detection algorithm |

**Deliberately not built:** connecting any of this to the real OpenAI-backed backend endpoints. Every mock/heuristic function above names the specific backend endpoint it should eventually call — wiring them up is a contained, page-by-page job once a live backend is available to test against, same reasoning as every other "not yet connected" note in this README.

## Latest round of fixes

- **AI task assistant is now floating and global.** Previously embedded only in the Dashboard's card grid, it's now `FloatingAssistant` (bottom-right button + panel) rendered once in `DashboardLayout` — available and its conversation persists across every dashboard page, not just Mission Control.
- **Calendar preview text no longer jumbles.** Added `truncateWords()` to `lib/calendar.ts`, capping meeting/deadline titles to 4 words in tight preview spaces (Week/Day time-grid blocks, deadline chips, Team's shared calendar preview) — CSS `truncate` alone wasn't enough in very narrow columns.
- **Meeting Notes now actually creates tasks.** The "Create tasks" button previously only changed a label to say it worked — it didn't call `TasksContext.addTask` at all. It now genuinely creates a task per selected action item (with AI-suggested labels via the same `suggestLabels()` from Phase 6), assigns it to the matched team member, and drops it in Backlog. Also added: select-all/deselect-all, a "start over" action, a word count, and a proper empty state before you've pasted anything.
- **Notification dropdown and card context menus fixed** — both were nested inside the normal page layout, which meant on some pages (Kanban's sticky column headers, glass-panel cards with `backdrop-filter`) they could render behind other elements, look unexpectedly transparent, or land in the wrong spot. Both `NotificationsBell` and `DropdownMenu` now render through a React portal into `document.body`, positioned from the trigger's real on-screen coordinates — this sidesteps page-specific stacking-context bugs entirely rather than trying to out-guess them with z-index.
- **Settings notification toggle redesigned.** The old implementation positioned the knob with `transform: translateX()` relative to an unset default position, which is fragile — it was the likely source of the "off" visual glitch when checked. Rewritten with explicit pixel `left` values (3px / 19px) and a fixed-size track, which is deterministic regardless of border/box-model edge cases.
- **Landing page "How it works" now animates on scroll.** Added `framer-motion`: each step fades and slides in with a staggered delay as it enters the viewport, a connecting gradient line draws itself in behind the step numbers, and hovering a step number scales and highlights it in teal.

## Latest round of fixes (spacing, truncation, animations, verification pass)

- **Settings and Meeting Notes no longer waste the right half of the screen.** Both previously used a single narrow `max-w-2xl`/`max-w-3xl` column with no centering, which left a large empty gap on wide screens. Settings is now a genuine two-column layout (Profile + Notifications on the left, Slack integration + Danger zone on the right). Meeting Notes is now side-by-side: paste/upload notes on the left, the AI summary and action items appear on the right as soon as they're ready — both collapse to a single column on mobile.
- **Calendar text truncation actually holds now.** `truncateWords()` previously only capped by word count, so an exactly-4-word title like "Load test task-generation endpoint" (34 characters) passed through untouched and could still overflow a narrow Week-view column. It now caps by character length too (26 chars) whichever limit hits first — verified against every real title in `mockData.ts`.
- **Page transitions added.** Navigating between dashboard pages now fades/slides smoothly (`AnimatePresence` + `framer-motion`, ~180ms) instead of snapping instantly — this was actually part of the original brief ("smooth page transitions") that hadn't been built yet.
- **Modal open/close now animates** (fade + slight scale, used by New Task, Task Details, Meeting Details, Invite Member) instead of appearing/disappearing instantly.

### A real bug this surfaced and fixed

Adding the modal animation exposed an actual bug, not just a missing detail: `TaskDetailModal` and `MeetingDetailModal` both closed by setting their data prop (`task`/`meeting`) to `null`, which made the component return `null` immediately — unmounting before the new fade-out animation could ever play, and in the process this would have been a silent, invisible failure (the modal would just vanish with no animation, easy to miss). Fixed by having both components hold onto the last-known task/meeting while their `open` prop transitions to `false`, letting the animation complete before the data actually clears. Caught via `tsc -b` after the change — a good example of why every round of changes in this project gets a full typecheck/lint/build pass rather than trusting that new code "looks right."

### Verification for this round

Ran and passed: `tsc -b` (zero errors), `oxlint src` (zero warnings), `vite build` (succeeds, no new warnings beyond the pre-existing bundle-size note). I also manually traced the core interactive flows in the code — task CRUD, Kanban drag/drop, calendar drag/resize/conflict detection, notifications, command palette, settings toggles, meeting-notes task creation — checking for null-safety and stale-closure issues, which is how the bug above was found before it shipped.

One honest limit: this is static analysis and code review, not literally clicking through a running browser. Things like exact animation smoothness, hover-state feel, and the precise on-screen position of the portal-based dropdowns (notifications, card menus) are worth a quick look once you have it running locally — those are the category of thing that can only be fully confirmed visually.

## Production-ready: sample data removed, landing page redesigned

Two changes, one focused on "the website" (public landing page) and one on "the system" (the dashboard app) — treated as genuinely separate asks.

### The dashboard no longer ships fictional data

Previously, every new signup saw four fictional employees (Maya Reyes, Daniel Cruz, Sofia Lim, Jay Torres), a dozen pre-filled tasks, nine fabricated meetings, a fake activity feed, and hardcoded analytics ("Maya Reyes is carrying 92% workload..."). That's fine for a demo, but not for a real product — a new account should start empty and fill up with the user's actual data, not someone else's fictional one.

**What changed:**

- **`TeamContext` (new)** — a real team, seeded with exactly one member: whoever is actually logged in, built from the real `/api/login` response (`name`, `email`, `role`). Everyone else has to be genuinely invited via the Team page. Every component that used to import the static `PEOPLE` array (13 files) now reads from `useTeam()` instead.
- **Tasks and meetings start empty.** `TasksContext` and `MeetingsContext` no longer seed from mock arrays — a fresh account has zero tasks and zero meetings, same as a real product would.
- **Workload is computed, not fabricated.** The old `workloadPct` field was a hardcoded number per fictional employee. It's now computed in `lib/team.ts` from each person's actual open (non-Completed) assigned tasks, relative to whoever has the most — genuinely derived, and honestly capped at what the app can actually measure (there's no time-tracking, so this is relative task-count load, not "true" utilization).
- **AI insights and recommendations are computed, not canned strings.** `lib/aiAssistant.ts` gained `computeRecommendation()` and `computeInsights()`, which look at real task state (at-risk items, workload imbalance, project pacing) and generate genuinely different output depending on what they find — including an honest "you don't have any tasks yet" message for a brand-new account, and an empty AI Insights panel (with a real empty state) when there's nothing notable to report, rather than always showing something.
- **The weekly performance chart is real now, not illustrative.** `Task` gained a `completedAt` timestamp, stamped automatically by `TasksContext` the moment a task's column becomes "Completed." The Dashboard and Reports pages both chart actual completion events over the last 7 days via a shared `lib/reports.ts` helper — empty (with an honest empty state) until you've actually completed something, then it grows as you use the app for real.
- **The old "Burn-down" chart is gone**, replaced with a "Tasks by column" distribution — a burndown needs a sprint concept (start/end dates) this app doesn't model; a real-time column distribution is something that's always genuinely computable instead.
- **"Recent activity" and Team's "Collaboration timeline"** both now render the same real notification feed from `NotificationsContext` (task created/completed/at-risk, meeting conflicts) instead of separate hardcoded fake activity arrays.
- **Reports' Project Status table** is derived from live tasks grouped by project name, not a separate hardcoded project list that could silently drift out of sync.
- **`mockData.ts` is down to genuine config** — priority colors, column names, and one clearly-labeled opt-in "Load sample" meeting transcript for the Meeting Notes page (the one deliberate exception, since it's a button a user explicitly clicks, not data injected automatically).

**What this means when you run it:** sign up, and you'll see an empty Mission Control, an empty Kanban board, and a team of one (you). Create a task, and the AI insights, workload gauges, and activity feed all start reflecting reality immediately.

### Landing page redesign

- **Fabricated testimonials removed.** The previous version had three quotes attributed to named, fictional people ("Priya Sharma, Head of Product, Northlight...") — presenting invented quotes as real customer testimonials on a page real visitors will read is misleading, regardless of how good the copy sounds. Replaced with a "See it in action" section describing three real product capabilities (meeting-notes conversion, risk detection, unified dashboard) with no fake attribution.
- **A hero product preview** — a stylized, CSS-built mockup of the actual dashboard (sidebar nav, stat cards, a miniature version of the Mission Orbit), built from the app's real design tokens rather than a static screenshot that would go stale as the product changes.
- **Scroll animations on every section**, not just "How it works" — Features, the new product-scenario cards, Pricing, and FAQ all fade/stagger in as you scroll, using the same `framer-motion` patterns established earlier.
- **Smoother interactions throughout** — the mobile nav menu slides open/closed instead of snapping, FAQ answers expand with a real height animation instead of appearing instantly, cards lift slightly on hover, buttons scale on hover.

One thing worth being direct about: I can't claim this is "the best in the world" — that's a marketing claim, not something a build can prove. What I can say is it no longer says anything untrue to a visitor, and it's been pushed as far toward a premium SaaS feel as this pass allows.

## Fixes from the single-file prototype version

- "New task" and "Add task" buttons are fully functional (shared state via `TasksContext`, not three disconnected copies)
- Sidebar collapses to a hamburger + slide-in drawer below the `lg` breakpoint
- Every icon-only button has an `aria-label`
- Team, Reports, and Settings are real, working pages — not "not wired up yet" placeholders

## Latest round of fixes

- **The rotating border was replaced.** The AI panels (Insights, Meeting Notes summary, login/signup cards) used a fast-rotating conic gradient that read as a stuck loading spinner rather than a design choice. It's now a slow, static-position pulsing glow (`ai-breathe` in `index.css`) — communicates "AI-active" without looking broken.
- **The notification bell is real now.** `NotificationsContext` derives notifications from actual state changes — a task being created, moved to Completed, or flagged at-risk — by diffing against what it's already seen. Nothing is fabricated; if you don't create or complete any tasks, the dropdown stays empty and says so.
- **Settings → Notifications** rows now sit in individual bordered cards instead of a floating list, and the toggle switches have a visible border in their "off" state so they don't look broken against the dark background.
- **Kanban board scrolling fixed.** Each column now has its own internal scroll area (`max-h-[calc(100vh-320px)]`) instead of letting a column with many cards stretch the whole page. Both the horizontal board scroll and every internal scroll area use a thin, dark-themed scrollbar (`.tf-scroll` in `index.css`) instead of the jarring browser default.
- **A priority-color legend (`PriorityLegend`) was added** to Dashboard (next to Mission Orbit), Kanban, Calendar, and Meeting Notes — the same four colors (Low/Medium/High/Critical) are used everywhere, and now every page that uses them explains what they mean instead of assuming it's obvious.

## Linting

This project uses **oxlint** (see the earlier conversation on why, over ESLint) — zero config needed:

```bash
npm run lint
```

## Next steps worth doing

1. Wire Dashboard/Kanban/Calendar/Team to real `GET /api/tasks`, `/api/teams/{team}` calls instead of mock data
2. Add a project picker (right now everything assumes one implicit project/team)
3. Real-time notifications via the Reverb setup from the backend (Echo client, see backend README)
4. Code-splitting — the build warned the JS bundle is ~640KB; lazy-load the dashboard routes with `React.lazy()` since landing-page visitors don't need Kanban/Calendar code yet
