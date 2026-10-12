# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Team leads and project managers at small teams (roughly 3–15 people). They coordinate several concurrent projects, plan in documents and spreadsheets, and currently lose time turning plans into tracked, assigned work. Their job: get the right work to the right person with minimal ceremony, and keep everyone aligned without status meetings.

## Product Purpose

TaskFlow AI turns real project plans into assigned, trackable team work. A lead uploads a plan (PDF, DOCX, TXT, MD), the AI extracts the tasks, and each task is auto-assigned to the right member by job title — then the lead reviews every row before approving, and real tasks (with dependencies as subtasks and suggested due dates) appear on the kanban board. Success means a plan that lived in a document becomes a staffed, dated, tracked board in minutes, and the team stays aligned through shared context (chat, comments, titles) instead of chat threads and meetings.

## Positioning

Plan-to-assigned-tasks via AI: upload a human-written plan, get back a reviewable, role-matched, ready-to-approve task board. A generic kanban (Linear, Jira, Trello, Asana) can store tasks after a human types them; it cannot read a plan and staff it. The review step is part of the mechanism — AI proposes, the human disposes.

## Operating Context

- Weekly (or per-project) planning rituals: plans arrive as PDF/DOCX/TXT/MD exports, often from other tools, rarely typed directly into TaskFlow.
- Small teams with named roles; members have job titles that drive assignment matching.
- Multiple projects per team; work is tracked on a kanban board with statuses backlog → todo → in_progress → review → testing → completed.
- Teams communicate in a shared team room and in per-task comment threads; @-style assignment is the primary coordination act.
- Billing matters: teams run on Free/Pro/Team plans with hard quotas (projects, seats, AI messages), so over-limit moments are part of the product's reality.
- Realtime is best-effort: the app works with or without a live websocket server (broadcast + polling fallback).

## Capabilities and Constraints

Confirmed functionality:

- AI plan import: upload ≤10MB PDF/DOCX/TXT/MD, text extraction, queued OpenAI extraction (strict JSON, `gpt-4o-mini`), role→member assignment matching, editable review screen, transactional approve → real tasks with `parent_task_id` dependency links and offset-based due dates.
- Kanban: six statuses, priorities, drag-and-drop ordering, subtasks, attachments (≤10MB, type allowlist), per-task comments, soft-delete recovery.
- Teams: members with job titles (presets + custom), owner/admin roles, team chat, AI assistant.
- Stripe billing in test mode: Cashier subscriptions keyed to teams, usage counters resetting monthly, plan-limit enforcement with upgrade prompts.
- Marketing site (landing, features, pricing, about) with plan comparison and checkout entry.

Durable constraints (confirmed by the user, 2026-10-08):

- Plan names and quotas: Free (3 projects / 3 seats / 50 AI messages), Pro ($14 / 25 / 15 / 1,000), Team ($29 / 50 / 100 / 5,000) — current `config/billing.php` numbers are the reference.
- The existing CSS-variable design system (`--tf-*` tokens) is preserved, not replaced.
- Accessibility commitment: WCAG-minded, keyboard-first, WAI-ARIA patterns, real empty/error states.

Explicitly undecided / open:

- Live `OPENAI_API_KEY` and Stripe live keys are not yet configured; imports fail gracefully by design until they are.
- Testimonials on the marketing site are labeled placeholders — no real customer evidence exists yet, and none may be fabricated.

## Brand Commitments

- Name: TaskFlow AI. Voice: direct, practical, no hype — the product's personality is "it just works," and copy should not oversell.
- No rebrand planned. Established product names (Kanban, Team, Billing) and the Free/Pro/Team plan naming are fixed.

## Evidence on Hand

- Marketing pages with plan copy matched to backend enforcement; testimonials are clearly labeled placeholders.
- No real customer evidence (testimonials, case studies, press, benchmarks). Future work must not fabricate any.

## Product Principles

1. **Plans in, tasks out.** The AI import is the spine. Every feature should shorten the path from intent to assigned, tracked work — never add a step the lead can't skip.
2. **Review, don't trust.** AI output is a proposal: editable before it becomes real, and honest about what it couldn't parse.
3. **Teams over individuals.** Shared context (chat, comments, titles, plan imports) beats private lists; the board is the source of truth.
4. **Preserve the incumbent system.** New UI extends the existing token language and components; it does not reintroduce a parallel visual dialect.
5. **Degraded gracefully.** External services (AI, Stripe, websockets) fail with honest, specific messages — never raw errors or silent stalls.

## Accessibility & Inclusion

WCAG-minded baseline: keyboard-first flows, visible focus, ARIA roles for custom widgets (dialogs, dropdowns, kanban), live-region feedback where it matters, and honest empty states. Mobile parity is expected — the board and chat are used on phones as well as desktops.
