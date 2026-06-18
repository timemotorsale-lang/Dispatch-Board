# Task: DB-026 Add scheduled generation entrypoint & DB-027 Add generation service tests

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DEFAULT_PROMPT.md`, and the relevant generation, settings, board, API, and test files first.

This is a follow-through task after the daily generation core and manual generation trigger work. Before editing, inspect the existing implementation for DB-022 through DB-025 and identify:

1. The current daily generation service entrypoint.
2. The current manual generation route/action from DB-025.
3. The current `GenerationRun` recording logic.
4. The current test framework and test data helpers.
5. Any existing deployment/platform cron conventions.

Do not make code changes until you understand those pieces.

## Goal

Implement:

- DB-026: a scheduled generation entrypoint that can be called by platform cron or a scheduled job.
- DB-027: automated generation service tests that protect the core generation workflow from regressions.

The scheduled entrypoint must call the same idempotent generation service used by the manual generation trigger. Do not create a second generation path.

## Current behavior

The app already has or should now have:

- Settings for daily generation time, timezone, and business days.
- Task templates and duty/role-based generation inputs.
- BoardDay, Task, and GenerationRun persistence.
- Idempotent task creation.
- Manual manager-triggered generation with UI feedback.
- Generation run recording for success and failure outcomes.

However, scheduled generation is not yet exposed as a safe cron/scheduled entrypoint, and the generation service does not yet have sufficient tests covering the most important generation scenarios.

## Desired behavior

### DB-026 Scheduled generation entrypoint

Add a scheduled generation entrypoint that:

1. Can be called by the app’s deployment scheduler or platform cron.
2. Uses the same generation service path as the manual generation trigger.
3. Resolves the board date using the configured timezone.
4. Respects configured business days if that behavior already exists.
5. Runs generation for the intended business date.
6. Records `GenerationRun.triggeredBy = scheduled`.
7. Does not require or impersonate a manager user.
8. Uses `triggeredByUserId = null` or the existing system-user convention if one already exists.
9. Returns a clear structured response with:
  - board date
  - status
  - run id if available
  - tasks created
  - tasks skipped or duplicates avoided
  - failure message when applicable
10. Is safe to retry without creating duplicate generated tasks.
11. Does not delete, overwrite, or mutate manual tasks.
12. Records failure outcomes through the existing `GenerationRun` failure logic.

If the route is publicly reachable, protect it with a server-only secret such as `CRON_SECRET` or the project’s existing equivalent. Use the existing project convention if one already exists.

Suggested route shape, unless the app already has a better convention:

```text
GET or POST /api/cron/generate-board

```

or:

```text
src/app/api/cron/generate-board/route.ts

```

Use the project’s existing Next.js route/action style. Do not introduce a new server framework.

If deployment platform config already exists, wire the scheduled entrypoint into that config. If no deployment platform has been chosen yet, do not invent a large deployment setup. Add only the secured entrypoint and update setup/docs with a short note explaining how a platform cron should call it.

### DB-027 Generation service tests

Add or expand tests for the generation service and scheduled entrypoint.

Cover at minimum:

1. Custom duties generate the expected daily tasks.
2. Role defaults are used when a user has no custom duties.
3. Re-running generation for the same date does not duplicate generated tasks.
4. Manual tasks on the same board date are preserved.
5. Generated tasks retain template references for duplicate prevention.
6. Successful generation records a completed `GenerationRun`.
7. Failed generation records a failed `GenerationRun` with an error message.
8. Manual and scheduled generation both call the same core generation service.
9. Scheduled generation records `triggeredBy = scheduled`.
10. The scheduled endpoint rejects unauthorized calls if a cron secret is required.
11. The scheduled endpoint returns a clear success or failure response.
12. Existing manual generation behavior from DB-025 still works.

Use the existing test runner and test patterns. Do not add a new test framework unless the repository has no viable test setup and the change is necessary.

## Implementation guidance

Prefer this structure unless the existing codebase already has stronger conventions:

```text
src/server/services/
  daily-generation.ts
  generation-runs.ts

src/app/api/board/generate/
  route.ts

src/app/api/cron/generate-board/
  route.ts

src/tests/unit/
  daily-generation.test.ts

src/tests/integration/
  scheduled-generation.test.ts

```

Keep the core generation workflow in a server service, not in route handlers.

The manual route and scheduled route should both call the same function, for example:

```ts
generateDailyBoard({
  boardDate,
  triggeredBy: "manual" | "scheduled",
  triggeredByUserId?: string | null
})

```

The exact function name can follow the existing code.

The scheduled route should be thin:

1. Validate cron authorization if needed.
2. Resolve date/timezone/settings.
3. Call the existing generation service.
4. Return structured JSON.
5. Let the service handle idempotency and generation run recording.

Do not duplicate task creation logic inside the route.

## Visual guidance from `UI_REFERENCE.png`

This task is mostly backend and tests. Do not redesign the board UI.

If any DB-025 generation feedback UI must be touched because of this task, preserve the visual direction from `UI_REFERENCE.png`:

- Keep the top action area clean and compact.
- Preserve the primary “Generate Board” control pattern.
- Keep generation status feedback visible but not visually loud.
- Use concise status language like “Generated”, “Failed”, “Retry available”, or “Scheduled”.
- Do not clutter the dashboard with cron/debug details.
- Keep the right-side activity/feed pattern clean if scheduled generation creates visible system events.
- Preserve the enterprise-level spacing, compact KPI cards, left sidebar, top controls, and right activity rail style.
- Avoid horizontal overflow and avoid enlarging controls unnecessarily.

Do not add a new cron management screen unless the existing settings UI already has a natural place for a small scheduled generation status note.

## Constraints

- Keep the change minimal and scoped to DB-026 and DB-027.
- Do not rewrite unrelated generation, board, settings, auth, or UI code.
- Do not add new dependencies unless necessary.
- Do not introduce live third-party integrations.
- Do not build advanced scheduling management UI.
- Do not create a separate generation implementation for cron.
- Do not bypass existing server-side policies or validation.
- Do not expose an unauthenticated public generation endpoint without secret protection.
- Preserve DB-025 manual generation behavior.
- Preserve idempotency and duplicate-prevention guarantees.
- Preserve manual tasks.
- Preserve existing tests.
- Add tests for new behavior and important existing generation behavior.
- Update docs only where setup, cron usage, environment variables, or architecture behavior changed.

## Edge cases to handle

- Scheduled endpoint called twice for the same date.
- Scheduled endpoint called after manual generation already ran.
- Manual generation called after scheduled generation already ran.
- No active users.
- User has custom duties.
- User has no custom duties but has role defaults.
- Template inactive.
- Generation service throws midway.
- Missing or invalid cron secret.
- Missing settings or timezone fallback.
- Non-business day behavior if business-day logic exists.
- Existing manual task on the board date.
- Existing generated task with the same board, template, and assigned user.

## Done when

- A scheduled/cron-safe entrypoint exists.
- The scheduled entrypoint calls the same idempotent generation service as manual generation.
- Scheduled generation records `GenerationRun.triggeredBy = scheduled`.
- Scheduled generation can be retried safely.
- Manual tasks are not deleted or overwritten.
- Duplicate generated tasks are not created.
- Failures record failed generation runs.
- Unauthorized scheduled calls are rejected if the route is protected by a cron secret.
- Generation service tests cover custom duties, role defaults, duplicate prevention, manual-task preservation, and failure recording.
- Tests also cover scheduled entrypoint behavior where practical.
- Existing manual generation behavior still works.
- Relevant unit/integration tests pass.
- Typecheck and lint pass if available.
- Docs are updated if a cron route, env variable, or setup instruction was added.
- Summarize:
  - files changed
  - scheduled entrypoint added
  - tests added
  - tests/checks run
  - any behavior intentionally left for a later roadmap item

