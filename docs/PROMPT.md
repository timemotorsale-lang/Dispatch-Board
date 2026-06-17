# Task: Implement v0.1.0 — Project Foundation

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and relevant files first.

## Goal

Implement the v0.1.0 Project Foundation milestone for the Time Motor Sales Dispatch Board.

This milestone should establish the basic web app scaffold, database baseline, source folder structure, local development workflow, quality commands, and setup documentation.

The goal is not to build the full Dispatch Board workflow yet. The goal is to create a clean, stable foundation that later milestones can build on safely.

## Current behavior

The repository is currently documentation-first and pre-implementation.

The app scaffold does not exist yet, or is not complete enough to support feature development.

## Desired behavior

Create the first working project foundation so that:

* The app boots locally.
* A minimal page renders successfully.
* The repository follows the planned architecture.
* Prisma and PostgreSQL baseline wiring exist.
* A fresh local database can run migrations and seed commands.
* Basic app shell and route placeholders exist.
* Lint, typecheck, and test commands are available.
* Setup documentation explains how to install, configure, run, migrate, seed, test, and develop the app.

## Scope

Implement only v0.1.0 from `docs/ROADMAP.md`.

Include these roadmap tasks:

### DB-001 — Initialize Next.js + TypeScript app

Create the base app scaffold, package manifest, and initial scripts.

Acceptance criteria:

* The project starts locally.
* The app renders a minimal page.
* TypeScript is configured.
* The project has clear `dev`, `build`, `start`, `lint`, `typecheck`, and `test` scripts where practical.

### DB-002 — Create repository and source folder layout

Add the planned folder structure from `docs/ARCHITECTURE.md`.

Required structure:

```text
docs/
prisma/
src/
  app/
  components/
  features/
  server/
  tests/
```

Also create reasonable placeholder subfolders where helpful:

```text
src/components/layout/
src/components/ui/
src/features/activity/
src/features/assignments/
src/features/auth/
src/features/board/
src/features/duties/
src/features/tasks/
src/features/users/
src/server/auth/
src/server/db/
src/server/policies/
src/server/repositories/
src/server/services/
src/server/validation/
src/tests/unit/
src/tests/integration/
src/tests/e2e/
```

Acceptance criteria:

* The repo matches the target layout from `docs/ARCHITECTURE.md`.
* Placeholder files are used only where necessary to keep empty folders in version control.
* Do not add business logic yet.

### DB-003 — Add PostgreSQL and Prisma baseline

Configure Prisma and PostgreSQL connection wiring.

Acceptance criteria:

* `prisma/schema.prisma` exists.
* Prisma is configured for PostgreSQL.
* A safe example env file exists, such as `.env.example`, showing required variables without real secrets.
* The real `.env` file is not committed.
* A reusable Prisma client entrypoint exists, likely under `src/server/db/`.

### DB-004 — Add first migration and seed entrypoints

Create initial migration workflow and seed command wiring.

Acceptance criteria:

* A fresh local database can run Prisma migration commands.
* A seed entrypoint exists, even if it only logs that seed data will be added in later milestones.
* The seed command is wired in `package.json`.
* Do not seed real customer, vehicle, staff, or password data in this milestone.

### DB-005 — Add shared app shell and route groups

Create the initial root layout, route structure, and placeholder shell.

Acceptance criteria:

* The app has a stable root layout.
* The home page or default route clearly identifies the app as “Time Motor Sales Dispatch Board.”
* Create placeholder route areas for future app sections where appropriate, such as:

  * login
  * board
  * tasks
  * settings
* Do not implement real auth yet.
* Do not implement real board/task functionality yet.
* Any protected-app shell should be clearly marked as a placeholder until auth exists.

### DB-006 — Add baseline lint, typecheck, and test setup

Configure baseline quality commands.

Acceptance criteria:

* Developers can run lint.
* Developers can run typecheck.
* Developers can run at least one baseline test command.
* Include at least one simple example test that proves the test runner is wired correctly.
* Avoid overbuilding the test setup. Keep it minimal and maintainable.

### DB-007 — Write setup and environment docs

Add `docs/SETUP.md` with local setup instructions.

Acceptance criteria:

* A new developer can set up and launch the project from the documentation.
* Include:

  * prerequisites
  * install command
  * environment variable setup
  * PostgreSQL/database setup notes
  * Prisma migration command
  * seed command
  * dev server command
  * lint/typecheck/test commands
  * troubleshooting notes for common setup issues
* Update `README.md` if needed so it points to `docs/SETUP.md`.

## Architecture constraints

* Use Next.js with React and TypeScript.
* Use PostgreSQL and Prisma for database baseline.
* Prefer one deployable web app.
* Keep the app responsive-ready, but do not spend this milestone on UI polish.
* Do not add live third-party integrations.
* Do not implement DealerCenter, Asana, Google Workspace, SMS, email, CRM, payroll, HR, or accounting integrations.
* Do not implement the full domain schema yet unless Prisma requires a minimal placeholder.
* Do not build auth, roles, duties, daily board generation, task CRUD, activity feed, recommendations, or manager review workflows in this milestone.
* Keep business logic out of UI components.
* Keep future server-side business logic paths ready under `src/server/`.
* Do not commit secrets, real `.env` files, local databases, caches, or generated build output.

## Implementation guidance

Start by inspecting the repository.

Before editing, briefly report:

1. Whether a Next.js app already exists.
2. What package manager appears to be used, if any.
3. Whether `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and `docs/AGENTS.md` exist.
4. The safest implementation plan for DB-001 through DB-007.

Then implement the milestone in the smallest practical set of changes.

Use sensible defaults if the repo is empty or pre-implementation:

* Next.js App Router
* TypeScript
* Tailwind CSS only if it is already selected or easy to add cleanly during scaffold
* Prisma with PostgreSQL
* Vitest or another lightweight test setup compatible with the stack
* ESLint and TypeScript checks

If a major dependency decision is unclear, choose the most standard option for the stack and explain the choice in the final summary.

## Done when

* The app can be started locally and renders a minimal foundation page.
* The planned source folders exist.
* Prisma is installed and configured for PostgreSQL.
* `.env.example` documents required environment variables.
* A migration workflow exists.
* A seed entrypoint exists.
* The root layout and placeholder app routes exist.
* Lint, typecheck, and test commands are available.
* At least one baseline test passes.
* `docs/SETUP.md` exists and explains how to run the app.
* `README.md` is updated if needed.
* No future milestone behavior is falsely presented as complete.
* No unrelated files are changed.

## Verification

After implementation, run the relevant commands that exist in the project, such as:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Also run Prisma validation or migration checks if practical, such as:

```bash
npx prisma validate
```

If any command cannot be run because of the local environment, explain exactly why.

## Final response required from Codex

When finished, summarize:

1. Files changed.
2. Foundation behavior added.
3. Database/Prisma setup added.
4. Commands run and results.
5. Anything not verified.
6. Remaining work for v0.2.0.
