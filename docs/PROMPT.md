# Task: DB-023 Build idempotent task creation flow

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DEFAULT_PROMPT.md`, and the relevant generation/schema/service files first.

## Goal

Implement the DB-023 daily generation task creation flow.

The generation service should create only missing generated tasks for a board date while preserving all existing manual tasks and making retries safe.

This issue is part of `v0.3.0 - Daily generation core`.

## Current behavior

The project should already have, or is expected to have from DB-020 through DB-022:

- `BoardDay`, `Task`, and `GenerationRun` schema/models.
- Duplicate-prevention constraints and useful indexes.
- Task template schema and CRUD.
- Generation input loading logic that can load active users, custom duties, role defaults, and active task templates for a target date.

However, the app does not yet have the actual idempotent task creation flow that turns generation inputs into persisted daily tasks.

## Desired behavior

Add server-side generation creation logic that:

1. Gets or creates the `BoardDay` for the target business date.
2. Uses the DB-022 generation input loading logic instead of reimplementing duty/template loading.
3. Builds generated task candidates from the loaded users, duties, role defaults, and task templates.
4. Creates only generated tasks that do not already exist for the same board/date/template/user combination.
5. Skips existing generated tasks on retry.
6. Never deletes, overwrites, or modifies manual tasks.
7. Never overwrites existing generated tasks that staff or managers may have already updated during the day.
8. Preserves source tracking on generated tasks:
  - `sourceType` should identify the task as generated from a template.
  - `sourceTemplateId` must be set.
  - `sourceDutyId` should be set when available.
  - `workflowArea` should come from the template.
9. Sets required task fields consistently:
  - title
  - description/notes if available
  - board day
  - assigned user
  - recommended user if available from existing logic
  - status, defaulting to `Not Started`
  - due time calculated from board date plus template default due time
  - created-by system/generation user if the schema supports it
  - `requiresManagerApproval`
10. Returns a useful summary object from the creation service, such as:
  - board date
  - board day id
  - total candidates considered
  - created task count
  - skipped existing task count
  - created task ids or lightweight created task references

## Important scope boundary

Do not implement the rest of the generation milestone in this issue.

Do not build:

- DB-024 generation-run started/completed/failed persistence, except for minimal compatibility if existing code already expects a summary return.
- DB-025 manual generation UI.
- DB-026 scheduled cron entrypoint.
- DB-041 or DB-042 activity event schema/event emission.
- Assignment recommendation matching rules beyond using any already-existing recommendation or input data.
- Board UI or task detail UI.

If one of those pieces is missing, leave a clear TODO or note for the later roadmap issue instead of expanding this task.

## Implementation guidance

Use the existing architecture patterns.

Likely areas to inspect:

- `prisma/schema.prisma`
- `src/server/services`
- `src/server/repositories`
- `src/server/validation`
- `src/tests`
- Any generation input loader created in DB-022

Suggested implementation shape:

1. Add or extend a daily generation service function, for example:
  ```ts
  createMissingGeneratedTasksForDate(date, options)

  ```
  or integrate this into the existing generation service if one already exists.
2. Add repository helpers only if needed, for example:
  - `getOrCreateBoardDay(date)`
  - `findExistingGeneratedTaskKeys(boardDayId)`
  - `createGeneratedTasks(candidates)`
  - `createGeneratedTasksIdempotently(...)`
3. Prefer a database transaction around:
  - board day upsert/find-or-create
  - existing generated task lookup
  - missing task creation
4. Prefer the existing unique constraint from DB-021 as the final protection against duplicate generated tasks.
5. If Prisma `createMany({ skipDuplicates: true })` is appropriate for the current schema/database, use it. If the app needs created task IDs returned, use a safe alternative pattern:
  - pre-read existing keys
  - create missing rows
  - re-read created rows by deterministic keys
  - still rely on the database unique constraint for race safety
6. Handle retry/concurrency carefully:
  - Re-running the service for the same date should not throw just because tasks already exist.
  - Concurrent generation attempts should not create duplicates.
  - Unique constraint conflicts caused by another concurrent run should be treated as “already exists” where practical, not as a fatal generation failure.
7. Use deterministic duplicate keys. The expected duplicate identity is:
  ```text
  boardDayId + sourceTemplateId + assignedUserId

  ```
  If the existing schema uses a different name or compound unique key from DB-021, follow the existing schema.
8. Do not treat manual tasks as duplicates. Manual tasks may have similar titles, users, or due times, but they must remain separate because they do not have the same generated-template identity.
9. Do not overwrite existing generated tasks. If a generated task already exists and a template changed later, leave the existing task untouched for that board date.
10. If the current schema cannot safely represent generated-task duplicate prevention, stop and report the missing prerequisite instead of making a broad schema redesign. Make only the smallest schema adjustment if absolutely necessary and explain why.

## Business rules to preserve

- There is one `BoardDay` per business date.
- Daily generation must be idempotent and safe to retry.
- Manual tasks must never be deleted or overwritten by daily generation.
- Generated tasks must retain template references for duplicate prevention.
- Every task must have a due time.
- Server-side services are the source of truth.
- Keep automation deterministic and manager-review friendly.

## Tests

Add focused tests for DB-023 behavior only.

Do not try to complete the full DB-027 test suite yet, but add enough coverage to prove this issue works.

Test cases should cover:

1. First run creates generated tasks for the date.
2. Second run for the same date creates zero duplicate generated tasks.
3. Manual tasks on the same board are preserved and are not modified.
4. Existing generated tasks are not overwritten on retry.
5. If one generated task already exists and another candidate is missing, the service creates only the missing one.
6. Due times are populated from the template default due time.
7. Generated tasks retain `sourceTemplateId`, `sourceDutyId` when available, `sourceType`, and `workflowArea`.
8. Concurrent or repeated calls do not create duplicate rows, as much as the current test setup can reasonably verify.

Use the existing test framework and patterns. If tests cannot be run, explain exactly why.

## Constraints

- Keep the change minimal and scoped to DB-023.
- Follow the existing architecture.
- Reuse the DB-022 input loading logic.
- Do not add new dependencies unless clearly necessary.
- Do not rewrite unrelated files.
- Do not build UI.
- Do not build cron/scheduled generation.
- Do not implement full generation-run failure recording yet.
- Do not implement activity feed persistence yet.
- Preserve existing behavior.
- Add or update tests where appropriate.
- Keep business logic in server services/repositories, not UI components.
- Use clear names that future DB-024 through DB-027 work can build on.

## Done when

- A server-side idempotent task creation flow exists for daily board generation.
- A board day is found or created for the requested date.
- Generated task candidates are created from the existing input loading logic.
- Only missing generated tasks are inserted.
- Re-running generation for the same date does not duplicate generated tasks.
- Manual tasks are not deleted, modified, or treated as duplicates.
- Existing generated tasks are not overwritten on retry.
- The service returns a useful creation summary.
- Focused tests cover duplicate prevention, manual-task preservation, and retry behavior.
- Relevant checks pass, such as:
  - `npm test`
  - `npm run typecheck`
  - `npm run lint`
  - `npx prisma validate`
- If any check cannot be run, summarize what was not verified and why.
- Summarize files changed, behavior added, and tests run.

