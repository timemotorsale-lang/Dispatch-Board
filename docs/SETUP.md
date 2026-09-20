# Setup

This guide is for setting up the Time Motor Sales Dispatch Board locally for development, testing, and MVP verification.

## Prerequisites

- Node.js 24 or newer
- npm 11 or newer
- PostgreSQL 15 or newer
- Chromium available for Playwright end-to-end tests

## Install dependencies

```bash
npm install
```

## Environment setup

1. Copy `.env.example` to `.env`.
2. Update the values for your local machine.
3. Do not commit `.env` or any real secrets.

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dispatch_board?schema=public"
CRON_SECRET="replace-with-a-long-random-secret"
NEXT_DIST_DIR=".next-local"
```

### Required variables

- `DATABASE_URL`
  Points Prisma and the app at your PostgreSQL database.
- `CRON_SECRET`
  Protects the scheduled generation endpoint at `/api/cron/generate-board`.
- `NEXT_DIST_DIR`
  Optional override for the Next.js build cache directory. The local default in this repo is `.next-local` to reduce Windows and OneDrive file-lock issues.

### Optional local test variables

- `PLAYWRIGHT_BASE_URL`
  Overrides the default local E2E URL of `http://127.0.0.1:3000`.

## Database setup

1. Create a local PostgreSQL database. The examples in this repo use `dispatch_board`.
2. Apply migrations:

```bash
npm run db:migrate
```

If you want to apply already-checked-in migrations without creating a new local migration, use:

```bash
npm run db:migrate:deploy
```

3. Generate the Prisma client:

```bash
npm run db:generate
```

4. Seed local development data:

```bash
npm run db:seed
```

5. Optional validation check:

```bash
npm run db:validate
```

## Seeded local users

The development seed creates day-one roles, duties, task templates, app settings, and local users.

All active seeded users share this local-only password:

```text
dispatch123!
```

Seeded accounts:

- `morgan.manager@local.test` - General Manager
- `riley.inventory@local.test` - Inventory Manager
- `casey.mechanic@local.test` - Mechanic
- `jordan.sales@local.test` - Salesperson
- `avery.ops@local.test` - Office Manager and Marketing/Advertisement Manager
- `quinn.collections@local.test` - Collections

Inactive seeded account:

- `jamie.inactive@local.test` - Salesperson

## Run the app

Start the development server:

```bash
npm run dev
```

Local URL:

- [http://127.0.0.1:3000](http://127.0.0.1:3000)

Current local workflow highlights:

- `/login` supports the seeded local accounts.
- `/board` shows the current board workflow surface.
- `/my-tasks` gives staff a focused view of their own tasks.
- `/tasks/[id]` shows task details, status updates, and comments.
- `/activity` shows today's event-backed activity feed.
- `/settings` allows managers to change generation time, timezone, and business days.

## Scheduled generation

The app exposes protected scheduler routes at:

- `/api/cron/generate-board`
- `/api/cron/evaluate-concerns`

Expected scheduled attempt states, skip reasons, and manager-safe operational meanings are defined in [docs/SCHEDULER_VERIFICATION_CONTRACT.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_VERIFICATION_CONTRACT.md).

Deployment validation and first-live proof should use:

- [docs/SCHEDULER_DEPLOYMENT_VERIFICATION_RUNBOOK.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_DEPLOYMENT_VERIFICATION_RUNBOOK.md)
- [docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_FIRST_LIVE_VALIDATION_WORKFLOW.md)

Provide either of these headers:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`

The route uses the configured app timezone, waits until the configured `dailyGenerationTime`, and skips days that are not enabled in app settings.

### Vercel cron setup

This repo now includes [vercel.json](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/vercel.json), which schedules `/api/cron/generate-board` and `/api/cron/evaluate-concerns` every 15 minutes in production.

Why every 15 minutes instead of once per day:

- The manager-controlled generation time lives in app settings, not in `vercel.json`.
- The board-generation route checks the configured timezone and `dailyGenerationTime` before generating.
- The concern-evaluation route keeps operational concern signals fresh on the same protected scheduler cadence.
- Once a board has already been generated for the day, later cron pings skip cleanly instead of creating duplicate scheduled runs.

Production checklist for auto-generation:

1. Deploy the app with `vercel.json` included.
2. Set `CRON_SECRET` in the deployment environment.
3. Set the desired generation time, timezone, and business days in `/settings`.
4. Follow the scheduler deployment runbook before relying on autonomous generation or concern evaluation.
5. Record the first live validation using the first-live validation workflow after the configured local generation time.

Use the scheduler verification contract as the meaning baseline for what you should expect to see:

- `unauthorized` means the route was hit but the secret wiring is wrong
- `skipped` means the route fired but intentionally did not generate
- `succeeded` means the autonomous generation path completed cleanly
- `failed` means the scheduler path needs operational attention before it is considered healthy

For release gating, do not stop at a casual spot-check. Use the release checklist and the first-live validation workflow to capture the first real scheduled evidence in a repeatable way.

### Non-Vercel hosting

If you deploy somewhere other than Vercel, configure a scheduler to call `/api/cron/generate-board` and `/api/cron/evaluate-concerns` at least every 15 minutes with one of the supported secret headers. The board-generation route handles timezone checks, business-day checks, and duplicate-safe generation.

## Quality and verification commands

Install:

```bash
npm install
```

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Typecheck:

```bash
npm run typecheck
```

Unit and integration tests:

```bash
npm test
```

End-to-end tests:

```bash
npx playwright install chromium
npm run test:e2e
```

Useful database commands:

```bash
npm run db:migrate
npm run db:migrate:deploy
npm run db:generate
npm run db:seed
npm run db:validate
```

### Prisma + Next.js dev cache note

If you regenerate Prisma after a schema change and Next.js still shows an old Prisma runtime error, the most common cause is a stale local dev server or stale `.next` cache.

Recommended recovery steps:

1. Stop the Next.js dev server completely.
2. If needed, stop leftover local `node.exe` processes.
3. Delete `.next`.
4. Run:

```bash
npm run db:generate
npm run dev
```

If Prisma itself works in a direct Node script but the app still shows an old datasource or runtime error, treat it as a stale Next/Turbopack cache first.

## Reset local database safely

If you need a clean local database:

1. Stop the app and test runners.
2. Drop or recreate only your local development database.
3. Re-run:

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```

Do not point destructive local reset steps at a shared or production database.

## Troubleshooting

### Database connection fails

- Confirm PostgreSQL is running.
- Confirm the database named in `DATABASE_URL` exists.
- Recheck username, password, host, port, and schema in `.env`.

### Prisma client is missing or stale

Run:

```bash
npm run db:generate
```

If the app still shows an older Prisma runtime error after regeneration, fully stop the dev server, remove the active Next cache directory (`.next-local` by default in local development), and start the app again.

### Port 3000 is already in use

- Stop the other local server using port `3000`, or
- Run the app on a different port and set `PLAYWRIGHT_BASE_URL` if you also plan to run E2E tests against it.

### Tests fail because the database is not migrated or seeded

Run:

```bash
npm run db:migrate
npm run db:generate
npm run db:seed
```

### Playwright browser dependencies are missing

Run:

```bash
npx playwright install chromium
```

### Scheduled generation returns unauthorized

- Confirm `CRON_SECRET` is set in `.env`.
- Confirm the request sends either the bearer token or the `x-cron-secret` header.
- For deployed environments, use the scheduler deployment runbook to verify both the app runtime secret and the scheduler caller secret wiring.

### PowerShell blocks npm execution

If PowerShell policy gets in the way, use `npm.cmd` instead of `npm` for local commands.

### Windows-specific Prisma regeneration edge case

On Windows, Prisma client regeneration can sometimes succeed while a still-running Next.js dev server continues serving an older compiled server bundle.

If `npm run db:generate` fails with an `EPERM` rename error for `query_engine-windows.dll.node`, treat that as a file-lock issue from a still-running local Node or Next.js process first.

Safe recovery sequence:

```bash
taskkill /F /IM node.exe
```

```bash
Remove-Item -Recurse -Force .next-local
```

```bash
cmd /c npm.cmd run db:generate
cmd /c npm.cmd run dev
```

Use this only for local development when you are comfortable stopping active Node-based dev processes.
