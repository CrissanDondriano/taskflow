# TaskFlow API Documentation

Base URL: `http://localhost:8000/api/v1` (development) · `https://taskflow-api-x5dc.onrender.com/api/v1` (production)

All endpoints are JSON. Authenticate with a Bearer token:

```
Authorization: Bearer <token>
```

---

## Authentication

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/register` | Public | 5/min | Create account. Body: `name`, `email`, `password`, `password_confirmation`, `role?` |
| POST | `/login` | Public | 5/min | Returns `{ user, token }` |
| POST | `/logout` | Bearer | — | Revokes current token |
| GET | `/me` | Bearer | — | Current user |
| POST | `/forgot-password` | Public | 5/min | Sends reset link. Body: `email` |
| POST | `/reset-password` | Public | 5/min | Body: `token`, `email`, `password`, `password_confirmation` |

---

## Teams

| Method | Endpoint | Description |
|---|---|---|
| GET | `/teams` | List teams (all for admins, own teams otherwise) |
| POST | `/teams` | Create team. Body: `name`, `description?` |
| POST | `/teams/{team}/members` | Add member. Body: `user_id`, `role_in_team?` (`lead`\|`member`) |
| DELETE | `/teams/{team}/members/{userId}` | Remove member |

---

## Projects

| Method | Endpoint | Description |
|---|---|---|
| GET | `/projects` | List (paginated, 20/page). Filters: `status`, `team_id` |
| POST | `/projects` | Create. Body: `name`, `team_id?`, `description?`, `priority?`, `start_date?`, `deadline?` |
| GET | `/projects/{project}` | Detail with tasks, team, insights |
| PUT/PATCH | `/projects/{project}` | Update |
| DELETE | `/projects/{project}` | Archive (soft, sets `status=archived`) |

---

## Tasks

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks` | List (paginated, 20/page). Filters: `project_id`, `status`, `assignee_id`, `priority` |
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
| POST | `/ai/meeting-notes` | Body: `project_id`, `notes`, `create_tasks?` |

User input is sanitized (control characters stripped, 10,000 char limit) before reaching OpenAI.

---

## Reports & Exports

| Method | Endpoint | Output |
|---|---|---|
| GET | `/reports/project-status` | JSON (cached 5 min) |
| GET | `/reports/team-performance` | JSON (cached 5 min) |
| GET | `/reports/productivity` | JSON (cached 5 min) |
| GET | `/reports/weekly-summary` | JSON with AI summary |
| GET | `/reports/project-status/export` | PDF |
| GET | `/reports/team-performance/export` | Excel/CSV |
| GET | `/reports/task-completion/export` | Excel/CSV |

---

## Integrations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/teams/{team}/integrations` | List integrations |
| POST | `/teams/{team}/integrations/slack` | Body: `webhook_url` (must be `https://hooks.slack.com/...`) |
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
| GET | `/notifications` | List (paginated, 20/page) |
| GET | `/notifications/unread-count` | `{ count }` |
| PATCH | `/notifications/{id}/read` | Mark one read |
| PATCH | `/notifications/read-all` | Mark all read |

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

---

## Security

- Rate limiting: 5 req/min on all auth endpoints
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- HTTPS enforced in production with HSTS
- AI input sanitized against prompt injection
- Integration credentials encrypted at rest
- Soft deletes on tasks (recoverable)
