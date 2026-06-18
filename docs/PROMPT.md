# Task: DB-021 Add task constraints and indexes

Read `docs/AGENTS.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DEFAULT_PROMPT.md`, `prisma/schema.prisma`, the latest Prisma migrations, seed files, and any existing schema tests before editing.

## Goal

Implement DB-021: add the database constraints and indexes needed to protect the daily dispatch workflow from duplicate generated tasks and to support common board, task, activity, and generation queries.

This task should harden the schema created in DB-020. Do not implement DB-022 generation input loading, DB-023 idempotent task creation service logic, or any board UI/API work in this task.

## Current behavior

DB-020 should already have the core `BoardDay`, `Task`, and `GenerationRun` schema/models.

However, the database may not yet fully enforce:

- One board per business date.
- Duplicate prevention for generated template tasks.
- Required due time on every task.
- Required blocker reason when a task is blocked.
- Required assignment unless the task is explicitly marked for manager review.
- Fast common queries for board tasks, activity feed, and generation runs.

## Desired behavior

Add or verify the following constraints and indexes in the database layer.

### Required constraints

1. `BoardDay.date` must be unique.
  - There should only be one board per business date.
2. Generated task duplicate prevention must be enforced.
  - There should be only one generated task for the same:
    - `boardDayId`
    - `sourceTemplateId`
    - `assignedUserId`
  - This applies when `sourceTemplateId` is present.
  - Manual, manager-created, or staff-created tasks with no `sourceTemplateId` must not be blocked from having similar titles, due times, or assignees.
3. `Task.dueAt` must be required.
  - Every task must have a due time.
4. `Task.blockerReason` must be required when task status is `Blocked`.
  - Prefer a DB-level check constraint if it can be added cleanly with the current Prisma/PostgreSQL setup.
  - Use the actual enum/status value already used in the schema.
  - Do not invent a new status model.
5. `Task.assignedUserId` must be required unless the existing schema already has an explicit manager-review/unassigned state.
  - Do not invent new fields just to satisfy this rule.
  - If the current schema allows manager-review tasks without an assigned user, add the safest minimal DB constraint possible based on the existing fields.
  - If the schema does not contain enough information to enforce this at the DB layer, document the limitation in the implementation summary and leave endpoint-level enforcement for the later workflow tasks.
6. User email and role name uniqueness should be verified.
  - If the current schema already enforces these, do not duplicate them.
  - If not, add the minimal uniqueness constraints consistent with the existing auth and role model.
  - If “unique active user emails” requires a partial index and the current schema supports inactive users, choose the least risky approach and explain it.

### Required indexes

Add or verify these indexes:

- `Task(boardDayId, status)`
- `Task(boardDayId, assignedUserId)`
- `Task(boardDayId, workflowArea)`
- `ActivityEvent(boardDayId, createdAt)` if `ActivityEvent` already exists
- `GenerationRun(boardDate, startedAt)`

If `ActivityEvent` has not been created yet, do not create the full activity-event schema in this task unless it already belongs to the current implemented baseline. In that case, skip that index and clearly report that it belongs with DB-041.

## Important Prisma/PostgreSQL guidance

- Inspect the current Prisma schema before choosing the exact implementation.
- Prefer Prisma-native `@unique`, `@@unique`, and `@@index` where they accurately express the rule.
- If Prisma cannot express a needed PostgreSQL check constraint, partial unique index, or expression index, use a raw SQL migration carefully and minimally.
- Be explicit about PostgreSQL `NULL` behavior in unique indexes.
  - Do not accidentally allow duplicate generated tasks because a nullable field is part of a unique constraint.
  - If `assignedUserId` or `sourceTemplateId` is nullable, choose the safest approach and explain the tradeoff in the final summary.
- Do not add new dependencies.
- Do not redesign the domain model.
- Do not rename existing models or fields unless the current schema is clearly inconsistent with the architecture and you explain why first.
- Avoid broad rewrites.

## Implementation guidance

1. Inspect the current schema and migrations.
2. Identify which constraints/indexes already exist.
3. Add only the missing constraints/indexes.
4. Create a new Prisma migration.
5. Add raw SQL inside the migration only when Prisma cannot express the constraint safely.
6. Run Prisma format/validate.
7. Update or add tests where practical.
8. Confirm seed data still works.
9. Do not change UI components.
10. Do not implement generation logic yet.

## Suggested tests

Add tests only where the current test infrastructure supports them. Prefer integration/schema-level tests if available.

Test these cases if practical:

1. Creating two `BoardDay` records with the same date is rejected.
2. Creating two generated tasks with the same `boardDayId`, `sourceTemplateId`, and `assignedUserId` is rejected.
3. Creating multiple manual tasks with no `sourceTemplateId` is still allowed.
4. Creating a task without `dueAt` is rejected.
5. Creating or updating a blocked task without `blockerReason` is rejected if the DB-level check was implemented.
6. Existing seed data still migrates and loads cleanly.

## Commands to run

Run the relevant commands that exist in the repo. Likely commands include:

```bash
npm run lint
npm run typecheck
npm test
npx prisma format
npx prisma validate
npx prisma migrate dev
npx prisma generate

```

If any command does not exist or cannot run in the current environment, report that clearly.

## Constraints

- Keep the change minimal.
- Follow the existing architecture.
- Do not add new dependencies.
- Do not rewrite unrelated files.
- Preserve existing behavior.
- Do not implement DB-022, DB-023, activity feed UI/API, board UI/API, or status-update endpoints.
- Do not create placeholder production behavior.
- Do not mark planned features as complete unless actually implemented.
- Update docs only if a real architecture/constraint limitation must be documented.

## Done when

- `BoardDay.date` uniqueness is enforced.
- Generated-task duplicate prevention is enforced without blocking manual tasks.
- Required task due time is enforced by the schema.
- Blocked-task blocker reason is enforced at the DB layer if safely possible, or the limitation is clearly documented.
- Assignment-required behavior is enforced at the DB layer if safely possible, or the limitation is clearly documented.
- Required indexes are added or verified.
- A migration is created and applies cleanly.
- Existing seed data still works.
- Relevant tests/checks pass, or skipped checks are clearly explained.
- The final response summarizes:
  - Files changed
  - Constraints added
  - Indexes added
  - Tests/checks run
  - Any limitations or follow-up needed

