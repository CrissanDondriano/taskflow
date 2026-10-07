# TaskFlow API Documentation

Base URL: `http://localhost:8000/api/v1` (development, `php artisan serve`) or `http://localhost/project/taskflow/taskflow-api/public/api/v1` (development via XAMPP Apache — what the Vite dev proxy forwards `/api` to) · `https://taskflow-api-x5dc.onrender.com/api/v1` (production)

All endpoints are JSON. Authenticate with a Bearer token:

```
Authorization: Bearer <token>
```

---

## Authentication

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/register` | Public | 5/min | Create account. Body: `name`, `email`, `password`, `password_confirmation`. Always created with role `member` (roles are assigned via the admin endpoints) |
| POST | `/login` | Public | 5/min | Returns `{ user, token }` |
| POST | `/logout` | Bearer | — | Revokes current token |
| GET | `/me` | Bearer | — | Current user |
| PATCH | `/me` | Bearer | — | Update profile. Body: `name`, `email` (unique except self). Retires stale password-reset links when the email changes |
| DELETE | `/me` | Bearer | — | Delete account. Body: `password` (current). Owned teams transfer to a surviving member (their projects/tasks/integrations follow); sole-owner teams and personal data are removed; tokens, sessions, notifications and reset links are revoked; the audit trail is kept |
| POST | `/forgot-password` | Public | 5/min | Sends reset link. Body: `email` |
| POST | `/reset-password` | Public | 5/min | Body: `token`, `email`, `password`, `password_confirmation` |

---

## Teams

| Method | Endpoint | Description |
|---|---|---|
| GET | `/teams` | List teams (all for admins, own teams otherwise). Paginated, 20/page (`?per_page=` up to 100) |
| POST | `/teams` | Create team. Body: `name`, `description?` |
| POST | `/teams/{team}/members` | Add member. Body: `user_id` **or** `email` (an existing account — the SPA invite form uses email), `role_in_team?` (`lead`\|`member`) |
| DELETE | `/teams/{team}/members/{userId}` | Remove member |

---

## Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects` | List (paginated, 20/page, `?per_page=` up to 100). Filters: `status`, `team_id` |
| POST | `/projects` | Create. Body: `name`, `team_id?`, `description?`, `priority?`, `start_date?`, `deadline?` |
| GET | `/projects/{project}` | Detail with tasks, team, insights |
| PUT/PATCH | `/projects/{project}` | Update |
| DELETE | `/projects/{project}` | Archive (soft, sets `status=archived`) |

---

## Tasks

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks` | List (paginated, 20/page, `?per_page=` up to 100). Filters: `project_id`, `status`, `assignee_id`, `priority` |
| POST | `/tasks` | Create. Body: `project_id`, `title`, `description?`, `assignee_id?`, `status?`, `priority?`, `due_date?`, `category?` |
| GET | `/tasks/{task}` | Detail with assignee, creator, subtasks, comments, attachments |
| PUT/PATCH | `/tasks/{task}` | Update |
| PATCH | `/tasks/{task}/move` | Kanban move. Body: `status`, `position` |
| POST | `/tasks/{task}/comments` | Add comment. Body: `body` |
| POST | `/tasks/{task}/attachments` | Upload file (multipart, max 10MB) |
| DELETE | `/tasks/{task}` | Soft delete (recoverable) |

**Statuses:** `backlog`, `todo`, `in_progress`, `review`, `testing`, `completed`
**Priorities:** `low`, `medium`, `high`, `critical`

---

## AI Features

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ai/ask` | Body: `question`, `project_id?` → `{ answer }` |
| POST | `/ai/generate-tasks` | Body: `project_id`, `goal`, `requirements?`, `create?` |
| GET | `/ai/risks` | Query: `project_id` → `{ risks }` |
| POST | `/ai/meeting-notes` | Body: `notes`, `project_id?`, `create_tasks?` (`project_id` required only with `create_tasks`) |

User input is sanitized (control characters stripped, 10,000 char limit) before reaching OpenAI.

---

## Reports & Exports

All report queries are scoped to the requester's visibility (visible projects/tasks, teammates — managers see everything) and cached per user for 5 minutes; any write to tasks/projects/users bumps the cache version so reports rebuild immediately. JSON responses use the `{ data }` envelope.

| Method | Endpoint | Output |
|---|---|---|
| GET | `/reports/project-status` | JSON `{ data }` — projects visible to you (cached 5 min) |
| GET | `/reports/team-performance` | JSON `{ data }` — teammates for members, everyone for managers (cached 5 min) |
| GET | `/reports/productivity` | JSON `{ data }` — your own 7-day completion trend (cached 5 min) |
| GET | `/reports/weekly-summary` | JSON `{ data: { stats, summary } }` — scoped to your visible data, with AI summary |
| GET | `/reports/project-status/export` | PDF (scoped to your visible projects) |
| GET | `/reports/team-performance/export` | Excel/CSV (scoped) |
| GET | `/reports/task-completion/export` | Excel/CSV (scoped; `project_id` filter can't cross tenants) |

---

## Integrations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/teams/{team}/integrations` | List integrations (`{ data }`) |
| POST | `/teams/{team}/integrations/slack` | Body: `webhook_url` (must be `https://hooks.slack.com/...`). Returns `{ data }` |
| DELETE | `/teams/{team}/integrations/{provider}` | Disconnect |
| GET | `/teams/{team}/integrations/google-calendar/redirect` | Start OAuth |
| GET | `/teams/{team}/integrations/outlook/redirect` | Start OAuth |
| GET | `/integrations/google-calendar/callback` | Public OAuth callback |
| GET | `/integrations/outlook/callback` | Public OAuth callback |

Credentials are stored encrypted (`encrypted:array` cast).

---

## Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | List (paginated, 20/page) — `{ data, meta }` |
| GET | `/notifications/unread-count` | `{ count }` |
| PATCH | `/notifications/{id}/read` | Mark one read — `{ data }` |
| PATCH | `/notifications/read-all` | Mark all read — `{ message }` |

---

## Admin

All admin endpoints require an authenticated user with role `admin` (enforced by the `EnsureAdmin` middleware); others receive HTTP 403.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Platform counts (`users`, `teams`, `projects`, `tasks`, `audit_events`) + AI status (`insights`, `configured`, `model`) |
| GET | `/admin/users` | Paginated user directory (20/page, `?per_page=` up to 100) with `role` and `assigned_tasks_count` |
| PATCH | `/admin/users/{user}/role` | Body: `role` (`admin`\|`manager`\|`member`). Returns 422 with `Cannot demote the last admin.` if the change would leave zero admins |
| GET | `/admin/audit-logs` | Paginated audit trail (25/page, `?per_page=` up to 100): logins, registrations, role changes |

Role changes, logins and registrations are recorded in `audit_logs` (action, acting user, metadata, IP address).

---

## Error Format

All API errors return a consistent JSON shape:

```json
{ "message": "Human-readable description" }
```

Validation errors return HTTP 422:

```json
{ "message": "...", "errors": { "field": ["Error message"] } }
```

| Status | Meaning |
|---|---|
| 401 | Unauthenticated (missing/invalid token) |
| 403 | Unauthorized (insufficient role/ownership) |
| 404 | Resource not found |
| 422 | Validation failed |
| 429 | Rate limited |

### Response envelopes

- **Records and collections** come back as `{ "data": ... }` — including paginated indexes, which add `{ "meta": { current_page, from, to, last_page, path, per_page, total } }`.
- **Action acknowledgements** stay flat: `{ "message": "..." }` (create/update/delete confirmations, `{ count }` for unread-count).
- **Documented exceptions:** auth responses (`{ user, token }` from login/register) and AI analysis payloads (`{ answer }`, `{ risks }`) are bare by long-standing convention — the SPA consumes them directly.

---

## Security

- Rate limiting: 5 req/min on all auth endpoints
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- HTTPS enforced in production with HSTS
- AI input sanitized against prompt injection
- Integration credentials encrypted at rest
- Soft deletes on tasks (recoverable)
- Self-registration cannot grant roles — new accounts are always `member`
- Admin routes gated by `EnsureAdmin`; role changes cannot remove the last admin
- Auth events (login, register) and role changes recorded in `audit_logs`
- Password-reset emails link to the frontend (`FRONTEND_URL` env)
- **Tenancy:** every project/task/report query is scoped to the caller's visibility (managers, project creators, team members) — one team's data is never visible to another team's members, including cached reports and exports
