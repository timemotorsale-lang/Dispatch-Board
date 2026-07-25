# Time Motor Sales Dispatch Board

Time Motor Sales Dispatch Board is an internal responsive web app for assigning, recommending, tracking, and managing daily dealership duties.

It is built for two kinds of users:

- Managers who need to generate the daily board, review assignments, spot blockers, and keep work moving.
- Staff who need to see their work, update status, add comments, and report blockers quickly from desktop or mobile.

This project is an internal operations tool. It is not a DealerCenter replacement, a CRM, an accounting system, or a full repair-order platform.

## Core MVP workflow

The MVP is centered on the daily dispatch workflow:

- Daily dispatch board generation from seeded roles, duties, and task templates
- Staff task updates with protected self-service permissions
- Required blocker reasons for blocked work
- Manager review support for approval-required tasks
- Assignment recommendations with explanation data
- Activity feed events for generation, task updates, blockers, comments, and review-ready work

## Current status

The repository already includes a working foundation for the MVP:

- Session-based login/logout with seeded local users
- Protected board, activity, settings, my-tasks, and task-detail routes
- PostgreSQL + Prisma schema, migrations, and seed data
- Daily board generation with duplicate prevention and generation-run tracking
- Staff task status updates, blocker validation, comments, and activity events
- Automated unit, integration, and end-to-end test coverage

Some planned MVP surfaces are still partial or deferred in the current codebase, including a dedicated manager review workspace and several non-core placeholder routes.

## Tech stack

- Next.js App Router
- React
- TypeScript
- PostgreSQL
- Prisma
- Server-side session auth
- Vitest
- Playwright

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and fill in local values:

```bash
copy .env.example .env
```

3. Create your local PostgreSQL database and apply migrations:

```bash
npm run db:migrate
```

4. Generate Prisma client and seed local development data:

```bash
npm run db:generate
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

If Prisma has just been regenerated after a schema change and the dev app still shows an older Prisma runtime error, stop the dev server, delete `.next`, and restart. See [docs/SETUP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SETUP.md) for the Windows-specific recovery note.

If Prisma regeneration fails on Windows with an `EPERM` rename error around `query_engine-windows.dll.node`, stop the local dev server before retrying generation.

6. Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

For the full setup flow, environment details, troubleshooting, and testing notes, see [docs/SETUP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SETUP.md).

For a production-oriented single-server Ubuntu deployment using Docker Compose,
PostgreSQL, Caddy HTTPS, scheduled jobs, and automated database dumps, see
[docs/DOCKER_DEPLOYMENT.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/DOCKER_DEPLOYMENT.md).
For private VPN access with Tailscale Serve and no public web listener, see
[docs/TAILSCALE_DEPLOYMENT.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/TAILSCALE_DEPLOYMENT.md).

## Quality commands

Use the real repo scripts from `package.json`:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm test` runs the Vitest suite, which covers both unit and integration tests in this repo.

## Project docs

- Current implementation status: [docs/CURRENT_IMPLEMENTATION_STATUS.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/CURRENT_IMPLEMENTATION_STATUS.md)
- Setup: [docs/SETUP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SETUP.md)
- Architecture: [docs/ARCHITECTURE.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/ARCHITECTURE.md)
- Roadmap: [docs/ROADMAP.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/ROADMAP.md)
- Projects module guide: [docs/projects/PROJECTS_MODULE_GUIDE.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/projects/PROJECTS_MODULE_GUIDE.md)
- Scheduler verification contract: [docs/SCHEDULER_VERIFICATION_CONTRACT.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/SCHEDULER_VERIFICATION_CONTRACT.md)
- Production scheduler task prompts: [docs/PRODUCTION_SCHEDULER_TASK_PROMPTS.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/PRODUCTION_SCHEDULER_TASK_PROMPTS.md)
- Enterprise Appointment program: [docs/appointments/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/appointments/README.md)
- MVP scope: [docs/MVP_SCOPE.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/MVP_SCOPE.md)
- Release checklist: [docs/RELEASE_CHECKLIST.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/RELEASE_CHECKLIST.md)
- Enterprise workspace UI source of truth: [docs/ENTERPRISE_WORKSPACE_UI_SOURCE_OF_TRUTH.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/ENTERPRISE_WORKSPACE_UI_SOURCE_OF_TRUTH.md)
- Time & Attendance program: [docs/time-attendance/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/time-attendance/README.md)
- Inventory-to-Frontline workflow planning package: [docs/inventory/frontline-workflow/README.md](/C:/Users/timem/OneDrive/Documents/GitHub/Dispatch%20Board/docs/inventory/frontline-workflow/README.md)

## MVP release boundary

The MVP focuses on the daily dispatch board and broad inventory, advertising, marketing, sales, and basic collections-related workflows.

Deferred after MVP:

- Native mobile apps
- DealerCenter or other DMS integrations
- Asana integration
- Google Workspace integration
- Email or SMS notifications
- Advanced AI-only assignment or capacity scoring
- Full CRM, accounting, repair-order, or compliance replacement
