# Setup

This project now includes the v0.2.0 identity, roles, and permissions foundation for the Time Motor Sales Dispatch Board.

## Prerequisites

- Node.js 24 or newer
- npm 11 or newer
- PostgreSQL 15 or newer

## Install dependencies

```bash
npm install
```

## Environment variables

1. Copy `.env.example` to `.env`.
2. Update `DATABASE_URL` for your local PostgreSQL instance.

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dispatch_board?schema=public"
```

## Database setup

1. Create a local PostgreSQL database named `dispatch_board`.
2. Run the initial Prisma migration:

```bash
npm run db:migrate:deploy
```

3. Generate the Prisma client:

```bash
npm run db:generate
```

4. Run the seed command:

```bash
npm run db:seed
```

The seed now creates:

- Day-one roles
- Starter duties and role default duties
- Local development manager and staff users
- Direct user duty assignments

## Local development login accounts

All seeded local users share this password:

```text
dispatch123!
```

Seeded accounts:

- `morgan.manager@local.test` — General Manager
- `riley.inventory@local.test` — Inventory Manager
- `casey.mechanic@local.test` — Mechanic
- `jordan.sales@local.test` — Salesperson
- `avery.ops@local.test` — Office Manager + Marketing/Advertisement Manager
- `quinn.collections@local.test` — Collections

Inactive test account:

- `jamie.inactive@local.test` — Salesperson, blocked from login

## Local development

Start the app:

```bash
npm run dev
```

The home page should render the current identity milestone overview, and `board`, `tasks`, and `settings` should redirect to `login` until you sign in with a seeded account.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:validate
```

## Troubleshooting

- If `npm` is blocked by PowerShell execution policy, use `npm.cmd` from PowerShell instead.
- If Prisma commands fail, confirm `.env` exists and `DATABASE_URL` points to a reachable PostgreSQL database.
- If migrations fail on a fresh database, make sure the target database exists before running the deploy command.
- If the Prisma client appears stale after schema changes, run `npm run db:generate` again.

