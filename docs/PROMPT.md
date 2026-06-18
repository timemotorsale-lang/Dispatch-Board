# Task: DB-022 Build generation input loading logic

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DEFAULT_PROMPT.md`, and the relevant existing service/repository/schema/test files first.

## Goal

Implement DB-022: build the generation input loading logic for the daily board generation workflow.

The service should load the data needed to decide what work should be considered during daily generation for a selected business date.

This task should prepare generation inputs only. Do not create tasks yet.

## Current behavior

The project now has the earlier daily generation foundation pieces planned or implemented:

- App settings schema/storage
- Task template schema
- Task template CRUD
- Board, task, and generation-run schema
- Task constraints and duplicate-prevention indexes

However, the generation service does not yet have a focused input-loading layer that can:

- Load active users
- Determine each user’s custom duties
- Fall back to role default duties when a user has no custom duties
- Load active templates connected to those duties or roles
- Return a structured, testable input model for later task creation

## Desired behavior

Add a server-side generation input loader that can be called by the future daily generation flow.

The loader should accept a business date and return a structured result containing:

- The requested board date
- Active users eligible for generation
- Each user’s roles
- Each user’s direct/custom duties
- Whether the user used custom duties or role-default duties
- The resolved duties that should be considered for that user
- Active task templates connected to those resolved duties and/or user roles
- Enough template context for DB-023 to create generated tasks later
- Clear warnings or empty arrays when a user has no eligible duties/templates

Expected high-level rule:

1. Load active users.
2. For each active user, load custom/direct duties.
3. If the user has custom duties, use those duties.
4. If the user has no custom duties, load role default duties based on the user’s active roles.
5. Load active task templates for the resolved duties and/or active user roles.
6. Deduplicate duties and templates so multi-role users do not produce duplicate template candidates.
7. Return a deterministic, sorted result that is easy to test.
8. Do not create `Task` records in this issue.

## Important scope boundary

Do not implement DB-023 in this task.

This means:

- Do not create generated tasks.
- Do not write duplicate-prevention task creation logic.
- Do not overwrite manual tasks.
- Do not create the full manual generation trigger.
- Do not build scheduled generation.
- Do not build recommendation scoring beyond preserving enough context for the future recommendation service.
- Do not create activity events unless the existing architecture already has a very small internal logging helper required by current patterns. Activity event emission is a later task.

## Architecture constraints

- Keep business logic server-side.
- Prefer files under `src/server/services` and `src/server/repositories`.
- Reuse existing repository/service patterns if they already exist.
- Do not bury generation rules in UI components.
- Do not add a new dependency unless absolutely necessary.
- Do not rename existing Prisma models, enums, or fields unless the existing implementation is clearly broken and you explain why first.
- Keep the change minimal and focused on DB-022.
- Preserve existing behavior and tests.
- Add or update tests for the new input-loading behavior.

## Suggested implementation guidance

Inspect the existing Prisma schema and adapt names to what already exists.

Prefer a shape similar to this, adjusted to the actual codebase:

```ts
type GenerationInput = {
  boardDate: string;
  users: GenerationInputUser[];
  warnings: GenerationInputWarning[];
};

type GenerationInputUser = {
  userId: string;
  userName: string;
  roleIds: string[];
  roleNames: string[];
  dutySource: "custom" | "role_default" | "none";
  duties: GenerationInputDuty[];
  templates: GenerationInputTemplate[];
};

type GenerationInputDuty = {
  dutyId: string;
  title: string;
  source: "custom" | "role_default";
  roleId?: string | null;
};

type GenerationInputTemplate = {
  templateId: string;
  title: string;
  description?: string | null;
  workflowArea: string;
  defaultDueTime: string;
  requiresManagerApproval: boolean;
  roleId?: string | null;
  dutyId?: string | null;
};

type GenerationInputWarning = {
  userId?: string;
  code: string;
  message: string;
};

```

The exact type names can differ if the project already has conventions.

Recommended files, adjusted to current project structure:

- `src/server/services/generation-inputs.ts`
- `src/server/repositories/generation-inputs-repository.ts`
- `src/server/services/generation-inputs.test.ts` or matching existing test location

The service should be easy for the future generation service to call, for example:

```ts
loadGenerationInputsForDate(boardDate: string): Promise<GenerationInput>

```

or, if the app uses dependency injection for tests:

```ts
loadGenerationInputsForDate({
  boardDate,
  db,
}: {
  boardDate: string;
  db?: PrismaClient;
}): Promise<GenerationInput>

```

## Business rules to preserve

- Only active users are included.
- Inactive users are excluded.
- Inactive templates are excluded.
- Inactive duties are excluded if the schema supports duty activity status.
- A user with direct/custom duties should use those custom duties.
- A user with no direct/custom duties should fall back to role default duties.
- A user with multiple roles should not receive duplicate duty/template candidates.
- Role overlap is allowed; do not assume a staff member has only one role.
- The loader should not fail the whole generation input load just because one user has no eligible templates. Return a warning or empty template list for that user.
- Keep output deterministic by sorting users, duties, and templates in a stable order.

## Tests to add or update

Add focused tests for the input loader.

Cover at least:

1. Active users are loaded and inactive users are ignored.
2. A user with custom duties uses those custom duties.
3. A user with custom duties does not fall back to role default duties.
4. A user without custom duties falls back to role default duties.
5. Active templates for resolved duties are returned.
6. Inactive templates are ignored.
7. Multi-role users do not produce duplicate duties or duplicate template candidates.
8. A user with no matching duties/templates is returned with an empty list and/or warning instead of causing the whole loader to fail.
9. The output ordering is stable enough for predictable tests.
10. Existing task/template/board constraints still pass.

Use the project’s existing test runner and test style. If there is not enough test infrastructure yet, add the smallest practical test setup consistent with the current repo.

## Done when

- A generation input-loading service exists and can be called with a board date.
- The service returns active users, resolved duties, and active template candidates.
- Custom duties and role-default fallback behavior work correctly.
- The loader does not create tasks.
- The loader does not implement DB-023, DB-024, DB-025, DB-026, or DB-045.
- Unit tests cover custom duties, role defaults, inactive records, deduplication, and empty/warning states.
- Existing tests still pass.
- Typecheck and lint pass if available.
- The change is small, reviewable, and scoped to DB-022.
- Any meaningful architecture or setup change is documented.
- Summarize files changed, behavior added, tests run, and any remaining work.

