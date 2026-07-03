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
```

### Required variables

- `DATABASE_URL`
  Points Prisma and the app at your PostgreSQL database.
- `CRON_SECRET`
  Protects the scheduled generation endpoint at `/api/cron/generate-board`.

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

The app exposes a protected scheduled-generation route at:

- `/api/cron/generate-board`

Provide either of these headers:

- `Authorization: Bearer <CRON_SECRET>`
- `x-cron-secret: <CRON_SECRET>`

The route uses the configured app timezone and skips days that are not enabled in app settings.

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

### PowerShell blocks npm execution

If PowerShell policy gets in the way, use `npm.cmd` instead of `npm` for local commands.
