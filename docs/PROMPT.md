# Task: DB-020 Add Board, Task, And Generation-Run Schema

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/prompts/DEFAULT_PROMPT.md`, and the relevant existing schema/migration files first.

## Goal

Implement DB-020: Add board, task, and generation-run schema.

Extend the Prisma schema and migration history so the app can represent:

- one `BoardDay` per business date
- generated and manual `Task` records tied to a board
- `GenerationRun` records that capture each generation attempt

This should build on the existing schema work already completed for users, roles, duties, settings, and task templates.

## Current Behavior

The current Prisma schema already includes:

- auth/session models
- role and duty assignment models
- `AppSetting`
- `TaskTemplate`

The schema does not yet include the daily board entities needed for generated work:

- no `BoardDay` model
- no `Task` model
- no `GenerationRun` model

As a result, the database cannot yet represent a generated board for a specific date, the tasks on that board, or the audit trail of generation attempts.

## Desired Behavior

Add the core Prisma models and relations needed for the daily generation workflow.

Implement:

1. `BoardDay` model

   - Represents a single business day board.
   - Includes the core fields called for by the architecture, such as:
     - `id`
     - `date`
     - `generationStatus`
     - `generatedAt`
     - `generatedByUserId` optional
     - timestamps if consistent with existing schema patterns
   - Relates to the user who triggered/generated the board when applicable.
   - Relates to board tasks.

2. `Task` model

   - Represents generated or manual work items.
   - Includes the architecture-required fields needed by later task, board, and review workflows, including:
     - `id`
     - `boardDayId`
     - `title`
     - `description`
     - `assignedUserId`
     - `recommendedUserId` optional
     - `status`
     - `dueAt`
     - `createdByUserId`
     - `requiresManagerApproval`
     - `vehicleReference` optional
     - `customerReference` optional
     - `sourceType`
     - `sourceTemplateId` optional
     - `sourceDutyId` optional
     - `workflowArea`
     - `blockerReason` optional
     - `readyForReviewAt` optional
     - `completedAt` optional
     - `reviewedByUserId` optional
     - `createdAt`
     - `updatedAt`
   - Includes the core relations needed for future work:
     - board day
     - assigned user
     - recommended user
     - creator user
     - reviewer user
     - source task template
     - source duty

3. `GenerationRun` model

   - Represents each automatic or manual generation attempt.
   - Includes the architecture-required fields, such as:
     - `id`
     - `boardDate`
     - `startedAt`
     - `finishedAt` optional
     - `status`
     - `triggeredBy`
     - `triggeredByUserId` optional
     - `summary` JSON
     - `errorMessage` optional
   - Relates to the user who manually triggered the run when applicable.

## Schema Design Expectations

Follow `docs/ARCHITECTURE.md` closely, but adapt field names carefully when Prisma or existing repo conventions make a slightly different naming choice more consistent.

Recommended enums to add if they do not already exist:

- board generation status enum for `BoardDay`
- task status enum for `Task`
- task source type enum for `Task`
- generation run status enum for `GenerationRun`
- generation trigger type enum for `GenerationRun`

Use enums instead of free-form strings when the allowed values are already defined clearly by the architecture.

Use the architecture's MVP task statuses:

- `Not Started`
- `In Progress`
- `Blocked`
- `Waiting on Parts`
- `Waiting on Approval`
- `Ready for Review`
- `Completed`

Map them into Prisma enum-safe names while preserving clear meaning.

## Architecture Requirements

Keep this issue focused on core schema and migration work.

Follow the existing repository structure and project conventions:

- Prisma schema changes in `prisma/schema.prisma`
- migration files in `prisma/migrations`
- seed updates only if they are needed to keep development workable after the schema change

This issue is primarily a database modeling task. Do not expand into full generation services, board APIs, task APIs, or UI unless a very small supporting change is truly required.

## Constraints

- Keep the change minimal and scoped to DB-020.
- Build on the existing `TaskTemplate` and auth-related schema instead of redesigning earlier work.
- Do not implement DB-019 task template CRUD if it is still incomplete.
- Do not implement DB-021 indexes/constraints beyond what is unavoidably required for a valid initial schema slice.
- Do not build the generation service yet.
- Do not build board read APIs, task mutation APIs, or UI flows yet.
- Do not add `TaskComment` or `ActivityEvent` unless the schema cannot compile cleanly without a placeholder relation strategy. Those belong to later roadmap items.
- Do not add third-party dependencies unless necessary.
- Do not rewrite unrelated auth, settings, board shell, or task template code.
- Preserve existing behavior.

## Relationship Rules

Model the core relationships so future issues can build on them cleanly:

- A `BoardDay` has many `Task` records.
- A `Task` belongs to one `BoardDay`.
- A `Task` may reference:
  - one assigned user
  - one recommended user
  - one creator user
  - one reviewer user
  - one source task template
  - one source duty
- A `GenerationRun` may reference one triggering user.
- User relations must be named clearly to avoid Prisma relation ambiguity.

Make relation names explicit anywhere the same two models connect in multiple ways.

## Validation Through Schema

For DB-020, add the fields and nullability needed to support the architecture, but avoid over-encoding later business rules too early.

Examples:

- `dueAt` should be required for tasks.
- `requiresManagerApproval` should be stored on tasks.
- `assignedUserId` should stay aligned with the architecture's expectation that tasks normally have an assignee.
- `blockerReason`, `readyForReviewAt`, `completedAt`, and `reviewedByUserId` should be nullable for now.

Prefer deferring complex partial unique indexes, conditional constraints, and status-dependent database checks to DB-021 or later unless they are already trivial and clearly safe.

## Migration Expectations

Create a real Prisma migration for the schema change.

Make sure:

- the schema formats and generates successfully
- the migration reflects the new models and enums
- the resulting Prisma client types are usable by later service work

If a migration cannot be created in this environment, update the schema and explain exactly what still needs to be generated.

## Tests And Verification

Run the relevant available checks after making the schema change.

At minimum, try the commands that fit this repo:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- Prisma format/generate or migration commands if available in the scripts or local setup

If any command does not exist or cannot run, state that clearly in the final summary.

## Done When

- `BoardDay`, `Task`, and `GenerationRun` exist in `prisma/schema.prisma`.
- Required supporting enums and relations are present and clearly named.
- The schema can represent one board per date, generated/manual tasks, and generation attempts.
- A Prisma migration has been added for the new schema, or the exact blocker is documented.
- Existing schema behavior is preserved outside the new models.
- Relevant checks are run and reported.
- The change is scoped and reviewable.
- No unrelated files are changed unless a small required follow-up such as seed typing or generated client compatibility is necessary.
- Final response summarizes:
  - files changed
  - schema/models added
  - checks run
  - any known follow-up work, especially DB-021 constraints and DB-022 through DB-024 workflow implementation
