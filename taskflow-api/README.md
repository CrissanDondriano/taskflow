# TaskFlow API

Laravel 12 REST API powering the TaskFlow frontend.

## Queue Worker

Notifications are queued (`QUEUE_CONNECTION=database`) and processed by a queue worker. Without a running worker, notifications will not be delivered.

**Development:** run everything together (API + queue + logs + Vite):

```bash
composer dev
```

This starts `php artisan queue:listen` alongside the API server.

**Production (Render):** add a separate worker process or use a supervisor. If you run only `php artisan serve`, queue jobs will remain in the `jobs` table until a worker picks them up.

You can process pending jobs manually with:

```bash
php artisan queue:work --tries=3
```

## AI Plan Imports

Upload a project plan (PDF, DOCX, TXT, MD ≤ 10MB) from the Kanban page's
"Import plan" button. The API stores the file privately, extracts its text
(`smalot/pdfparser` for PDF, `phpoffice/phpword` for DOCX), and queues a
`ProcessPlanImport` job that asks OpenAI for a strict-JSON task list,
matches each row to a member by job title (`TaskAssignmentService`), and
marks the import `ready`. The review screen then lets you edit every row
before `POST /api/plan-imports/{id}/approve` creates the real tasks in one
transaction (dependencies become subtasks via `parent_task_id`).

Setup:

```bash
# 1. Text extraction needs GD (already enabled in C:\xampp\php\php.ini):
php -m | findstr gd
# 2. Migrate + an OpenAI key:
php artisan migrate
# OPENAI_API_KEY=sk-... in .env (OPENAI_MODEL defaults to gpt-4o-mini)
# 3. Run a queue worker — without one, imports sit at "pending":
php artisan queue:work --tries=1
```

Status changes broadcast on the private `team.{teamId}` channel as
`plan-import.status` (Reverb). The SPA polls `GET /api/plan-imports/{id}`
every 2s while processing, so it works with or without a live Reverb
server. To run Reverb locally:

```bash
php artisan reverb:start
```

Without `OPENAI_API_KEY`, imports fail fast with a friendly message
instead of hanging — set the key to use the feature for real.

## Billing (Stripe test mode only)

Plans and limits live in `config/billing.php` (auto-provisioned into the
`plans` table + `PlanSeeder`). Billing attaches to teams (the workspace).

```bash
# 1. Test keys only — never commit live keys:
# STRIPE_KEY=pk_test_...
# STRIPE_SECRET=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
# 2. Create test products/prices (prints STRIPE_PRICE_* lines for .env):
php artisan billing:sync-plans
# 3. Forward webhooks while developing (the webhook is the source of truth
#    for subscription state — never trust the frontend redirect):
stripe listen --forward-to localhost:8000/api/webhooks/stripe
# 4. Run a queue worker (plan imports) and the API:
php artisan queue:work --tries=1
```

Test cards: `4242 4242 4242 4242` (any future expiry, any CVC) succeeds;
`4000 0000 0000 0002` always fails (use it to see the past-due state on
the billing page). Going live later = swap the keys + price IDs for live
values (the `isTestMode` banner disappears on its own); no code changes.

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

## Testing

```bash
php artisan test
```

---

<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
