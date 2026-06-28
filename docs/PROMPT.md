# Task

DB-056 — Finalize README, setup docs, and release checklist

# Goal

Finalize the project documentation so another developer can clone the Time Motor Sales Dispatch Board repository, understand what the app does, configure the environment, run it locally, run tests/checks, and follow a clear MVP release checklist.

This is primarily a documentation and release-readiness task. Do not change product behavior unless you discover that a documented command is wrong and requires a very small supporting fix.

# Required context

Read these first:

- `docs/AGENTS.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- Existing `README.md`, if present
- Existing `docs/SETUP.md`, if present
- `package.json`
- Prisma config/schema and seed files
- Test config files
- Any existing env example files

Follow the project rules in `docs/AGENTS.md`: keep changes scoped, do not rewrite unrelated files, do not invent completed features, and update docs when setup, architecture, workflow, or commands change. :contentReference[oaicite:1]{index=1}

# Current behavior

The app has reached the end of the MVP reliability/release-readiness roadmap. The remaining work is to make the repo understandable and repeatable for a new developer or reviewer.

# Desired behavior

The repo should include clear, accurate docs for:

1. What the Time Motor Sales Dispatch Board is.
2. MVP scope and core workflows.
3. Local setup.
4. Environment variables.
5. Database setup, migration, and seed steps.
6. How to run the app.
7. How to run lint/typecheck/tests/e2e checks.
8. How to troubleshoot common local setup issues.
9. What is included in the MVP release.
10. What is intentionally deferred after MVP.
11. A practical release checklist for verifying the app before calling the MVP ready.

The release section should align with the guide’s release expectations: build scripts, deployment guide, environment variable docs, and release checklist. :contentReference[oaicite:2]{index=2}

# Files to create or update

Update or create only the docs needed for DB-056, such as:

- `README.md`
- `docs/SETUP.md`
- `docs/RELEASE_CHECKLIST.md` or `docs/RELEASE.md`
- `.env.example`, only if missing or outdated
- Optional: `docs/TROUBLESHOOTING.md` if the setup docs would become too long

Do not create unnecessary docs.

# Documentation requirements

## README.md should include

- Project name and short summary.
- Who the app is for: manager and staff users.
- Core MVP workflows:
  - Daily dispatch board
  - Staff task updates
  - Blocker reasons
  - Manager review
  - Assignment recommendations
  - Activity feed
- Tech stack actually used in the repo.
- Quick start commands.
- Links to deeper docs:
  - `docs/SETUP.md`
  - `docs/ARCHITECTURE.md`
  - `docs/ROADMAP.md`
  - Release checklist doc
- Current MVP status.
- Clear note that this is an internal operational tool, not a DealerCenter/CRM/accounting replacement.

Use the product docs as the source of truth: the app is a responsive internal web app for assigning, recommending, tracking, and managing daily dealership duties. :contentReference[oaicite:3]{index=3}

## docs/SETUP.md should include

- Prerequisites:
  - Node version
  - Package manager used by the repo
  - PostgreSQL requirement
  - Browser requirement if e2e tests exist
- Install steps.
- Environment setup:
  - Copy `.env.example` to `.env`
  - Explain each required variable
  - Never include real secrets
- Database setup:
  - Create local database
  - Run Prisma migration command
  - Run seed command if available
- How to start the dev server.
- Local app URL.
- Default seeded users, only if safe and already present in seed data.
- How to reset local database safely.
- Common troubleshooting:
  - Database connection fails
  - Prisma client not generated
  - Port already in use
  - Tests fail because DB is not migrated
  - E2E browser dependencies missing

## Release checklist doc should include

Create a practical checklist for MVP release verification.

Include sections for:

### 1. Environment readiness

- Required env vars are documented.
- `.env.example` is complete.
- No secrets are committed.
- Local and production database URLs are separated.
- Build environment is clear.

### 2. Database readiness

- Migrations run cleanly.
- Seed data runs safely.
- No real customer data is seeded.
- Prisma client generation works.

### 3. App checks

- App boots locally.
- Login/logout works.
- Manager can open the board.
- Staff can open their task view.
- Manual generation works.
- No obvious loading, empty, or error state gaps in core views.

### 4. Core MVP workflow verification

- Daily board generation does not duplicate tasks.
- Manager can create a task.
- Staff can update their own task.
- Staff cannot update another user’s task.
- Blocked status requires blocker reason.
- Approval-required tasks go through Ready for Review.
- Manager can approve or reopen review tasks.
- Activity feed shows key workflow events.
- Recommendation explanations appear where applicable.

### 5. Test and quality commands

Document the actual commands from `package.json`, such as:

- install
- dev
- build
- lint
- typecheck
- unit tests
- integration tests
- e2e tests

Use the real command names from the repo. Do not invent commands.

### 6. Manual QA checklist

Include browser/viewport checks:

- Mobile staff task experience
- Tablet board layout
- Desktop board/activity feed layout
- Loading states
- Empty states
- Error states
- No horizontal overflow

### 7. Known limitations / deferred scope

List only true deferred MVP items from the product docs and roadmap, including:

- No native mobile app
- No DealerCenter/DMS integration
- No Asana integration
- No Google Workspace integration
- No SMS/email notifications
- No advanced AI/capacity scoring
- No full CRM/accounting/repair-order replacement

The MVP intentionally focuses on the daily dispatch board and broad inventory, advertising, marketing, and sales workflows. :contentReference[oaicite:4]{index=4}

# Constraints

- Keep the change minimal and documentation-focused.
- Do not refactor app code.
- Do not add dependencies.
- Do not rewrite architecture or roadmap direction.
- Do not claim planned features are complete unless the current code supports them.
- Do not include real dealership customer data, real passwords, or secrets.
- Use the actual current repo commands from `package.json`.
- If a command cannot be verified, document that carefully instead of pretending.
- Keep docs practical and readable for a developer setting up the app for the first time.

# Implementation guidance

1. Inspect the repo structure and identify current docs, scripts, env vars, Prisma setup, and test commands.
2. Compare the existing docs against the DB-056 acceptance criteria.
3. Update `README.md` first so it gives a clear high-level project overview.
4. Update or create `docs/SETUP.md` with exact local setup instructions.
5. Create or update a release checklist document.
6. Update `.env.example` only if needed.
7. Review the docs for accuracy against the actual codebase.
8. Run relevant non-destructive checks if possible.

# Done when

- `README.md` clearly explains the app, MVP workflow, tech stack, and quick start.
- `docs/SETUP.md` lets a new developer set up, run, migrate, seed, and test the project.
- A release checklist exists and covers environment, database, core workflow, tests, manual QA, and known limitations.
- Environment variables are documented without exposing secrets.
- Commands match the actual repo scripts.
- Deferred features are clearly marked as deferred, not completed.
- No unrelated code changes are made.
- Relevant checks are run, or any skipped checks are clearly explained.
- Summarize:
  - Files changed
  - Docs added or updated
  - Commands verified
  - Checks run
  - Remaining release risks, if any