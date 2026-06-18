# Task: DB-024 — Record generation runs and failure outcomes

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and the relevant generation, board, task, repository, Prisma, and test files first.

## Goal

Implement DB-024 from `docs/ROADMAP.md`:

Persist every daily board generation attempt as a `GenerationRun`, including started, completed, and failed outcomes, with useful summaries and error messages.

The generation workflow must make it clear whether a generation attempt succeeded or failed, and failure states must be visible and retryable instead of silently ignored.

## Current behavior

DB-020 through DB-023 should already provide the foundation for:

- `BoardDay`, `Task`, and `GenerationRun` schema support.
- Task constraints and duplicate-prevention indexes.
- Generation input loading.
- Idempotent generated task creation.
- Retry-safe generation that does not duplicate generated tasks.
- Manual tasks being preserved during generation retries.

However, generation attempts are not yet fully tracked as durable lifecycle records. A generation may create tasks, skip duplicates, or fail, but the app does not yet consistently persist a clear `GenerationRun` record with:

- Start time.
- Finish time.
- Final status.
- Trigger source.
- Triggering user when manual.
- Summary counts.
- Failure message when applicable.

## Desired behavior

Every generation attempt should create and update a `GenerationRun` record.

### Required run lifecycle

When daily board generation starts:

1. Create a `GenerationRun` record immediately.
2. Set:
  - `boardDate`
  - `startedAt`
  - `status = started` or the existing equivalent enum/value
  - `triggeredBy = manual` or `scheduled`
  - `triggeredByUserId` when available
  - initial `summary` if useful, such as requested date and trigger context

When generation completes successfully:

1. Update the same `GenerationRun`.
2. Set:
  - `status = completed` or the existing equivalent enum/value
  - `finishedAt`
  - `summary` JSON with useful counts and references

The success summary should include as many of these as are available from the existing generation flow:

- `boardDate`
- `boardDayId`
- `triggeredBy`
- `triggeredByUserId`
- `usersConsidered`
- `templatesConsidered`
- `tasksCreated`
- `tasksSkippedAsDuplicates`
- `manualTasksPreserved`
- `tasksAlreadyExisting`
- `durationMs`

When generation fails:

1. Update the same `GenerationRun`.
2. Set:
  - `status = failed` or the existing equivalent enum/value
  - `finishedAt`
  - `errorMessage`
  - failure `summary` JSON with safe diagnostic context

The failure summary should include useful non-sensitive information such as:

- `boardDate`
- `triggeredBy`
- `triggeredByUserId`
- `phase` if the code can identify where the failure occurred
- `durationMs`
- `errorName`
- any reliable partial counts available before failure

Do not store full stack traces, secrets, environment values, raw database connection strings, or sensitive customer data in `errorMessage` or `summary`.

## Important implementation guidance

### 1. Do not lose failed run records because of a rolled-back transaction

Be careful with transaction boundaries.

If the existing generation service wraps task creation in a transaction, do not create the initial `GenerationRun` inside the same transaction if a later failure would roll it back.

Preferred pattern:

1. Create the `GenerationRun` before the main generation transaction.
2. Run the generation workflow.
3. On success, update the run to completed.
4. On failure, catch the error and update the run to failed outside the failed transaction.
5. Re-throw the original error or return the existing failure result shape, depending on the current service pattern.

A failed generation attempt must leave a durable failed `GenerationRun`.

### 2. Preserve the DB-023 idempotent task creation behavior

This task must not weaken retry safety.

Re-running generation for the same date should still:

- Create only missing generated tasks.
- Skip duplicates.
- Preserve manual tasks.
- Avoid overwriting existing generated tasks unless existing code intentionally supports updates.
- Create a new `GenerationRun` for each attempt, even when tasks are skipped as duplicates.

Multiple generation runs for the same date are allowed and expected. The run history should show each attempt.

### 3. Add generation-run repository/service helpers

Follow the existing architecture and naming conventions. If repository/service patterns already exist, use them.

Add or complete helpers similar to:

- `startGenerationRun(...)`
- `completeGenerationRun(...)`
- `failGenerationRun(...)`
- `listGenerationRunsForDate(...)` or equivalent read helper if needed for manager inspection

Do not create unnecessary abstractions. Keep the implementation minimal and aligned with the current project patterns.

### 4. Manager inspection

DB-024 acceptance criteria says managers can inspect whether a generation attempt succeeded or failed.

Implement the smallest backend read path needed for this stage.

Acceptable options, depending on current project structure:

- A repository/service function that returns generation runs for a date.
- A manager-only API/server action if generation-related backend routes already exist.
- If the app has no API surface yet for this area, do not build a UI; add the service/repository read path and tests.

Do not implement the DB-025 manual generation UI or UI feedback in this task unless a tiny API adjustment is necessary to expose the persisted result.

### 5. Keep failure behavior honest

Do not silently swallow generation failures.

If the existing generation function throws on failure, preserve that behavior after recording the failed run.

If the existing generation function returns a typed result, return a failure result that includes the `generationRunId` and safe failure message.

Either way, callers should be able to tell:

- Which run was created.
- Whether it completed or failed.
- What safe error message was recorded.

### 6. Use existing schema when possible

`GenerationRun` should already exist from DB-020.

Use the existing fields if present:

- `id`
- `boardDate`
- `startedAt`
- `finishedAt`
- `status`
- `triggeredBy`
- `triggeredByUserId`
- `summary`
- `errorMessage`

If any required field is missing, add the smallest Prisma schema/migration change needed to support the architecture. Do not redesign unrelated models.

If the project already has enum names or status casing, follow the existing style instead of inventing a second convention.

## Constraints

- Keep the change minimal and scoped to DB-024.
- Do not rewrite the generation service broadly.
- Do not implement DB-025 UI controls.
- Do not implement scheduled generation from DB-026.
- Do not implement activity event schema or activity feed features from DB-041/DB-042 unless they already exist and the current generation service already depends on them.
- Do not add new dependencies unless absolutely necessary.
- Preserve existing auth, policy, task creation, template, board, and idempotency behavior.
- Keep business logic server-side.
- Use Prisma and existing repository/service patterns.
- Update docs only if behavior, commands, or architecture details changed.
- Do not commit `.env`, local databases, generated build output, caches, or secrets.

## Tests to add or update

Add focused tests around generation run recording.

At minimum, cover:

1. Successful generation creates a `GenerationRun` and updates it to completed.
2. Completed run includes `startedAt`, `finishedAt`, `status`, `triggeredBy`, and useful summary counts.
3. Failed generation creates a `GenerationRun` and updates it to failed with `finishedAt` and `errorMessage`.
4. Failed run remains persisted even if task creation/input loading throws.
5. Retrying generation for the same date creates a separate `GenerationRun` but does not duplicate generated tasks.
6. Manual tasks remain preserved during retries.
7. Manager inspection/read helper returns the recent runs for a board date, if a read helper/API is added.

Use the existing test framework and test style. If integration tests require database setup that is not available yet, add the most practical unit/service tests and clearly explain what could not be verified.

## Suggested implementation steps

1. Inspect the current generation service from DB-022 and DB-023.
2. Inspect the current `GenerationRun` Prisma model and generated client types.
3. Identify the existing result shape returned by daily generation.
4. Add small repository/service helpers for generation run lifecycle updates.
5. Wrap the generation entrypoint with run start/completion/failure recording.
6. Ensure failure recording happens outside any transaction that may roll back.
7. Add a manager inspection read helper or route only if it fits the current app structure.
8. Add or update tests.
9. Run relevant checks.
10. Summarize files changed, behavior added, and tests run.

## Done when

- Every generation attempt creates a durable `GenerationRun`.
- Successful attempts are marked completed with `finishedAt` and a useful summary.
- Failed attempts are marked failed with `finishedAt`, safe `errorMessage`, and safe failure summary.
- A failed generation does not disappear due to a rolled-back transaction.
- Retrying generation still does not create duplicate generated tasks.
- Manual tasks are still preserved.
- Managers/backend read paths can inspect generation run outcomes for a board date.
- Relevant tests pass.
- Typecheck and lint pass if available.
- No unrelated files are changed.
- Any skipped checks are named with a clear reason.
- The final response summarizes:
  - Files changed
  - Behavior added
  - Tests/checks run
  - Any remaining work for DB-025 or DB-026

