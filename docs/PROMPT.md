# Task: DB-018 Add task template schema

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and relevant Prisma/server files first.

## Goal

Implement the database schema foundation for task templates.

Task templates define reusable daily task generation rules. They will later be used by the daily board generation service to create role-based and duty-based tasks for each business day.

This task should only add the schema, migration, and minimal seed/test support needed for task templates. Do not build template CRUD, daily generation, board UI, or recommendation logic yet.

## Current behavior

The app has or is expected to have foundational identity, role, duty, app settings, and manager settings flow work from earlier issues.

There is not yet a `TaskTemplate` model that can represent daily work templates tied to roles, duties, workflow areas, due times, and manager approval requirements.

## Desired behavior

Add a `TaskTemplate` model to the Prisma schema that supports the MVP daily generation workflow.

The model should support:

* A required title.
* An optional description.
* A workflow area/category for the task.
* A default due time used when generated tasks are created.
* A manager approval requirement flag.
* Optional role association for role-based default templates.
* Optional duty association for duty-based/custom-duty templates.
* An active/inactive flag.
* Standard created/updated timestamps.
* Stable relationships to existing `Role` and `Duty` models if those models already exist.

The schema should allow templates to represent:

1. Role-based daily work.
2. Duty-based daily work.
3. Active templates used by future generation logic.
4. Inactive templates that should not generate future tasks.
5. Templates requiring manager approval before completion.

## Suggested model shape

Use the existing naming/style conventions in `prisma/schema.prisma`. Adjust names only if the existing codebase has already established different conventions.

Suggested fields:

```prisma
model TaskTemplate {
  id                      String   @id @default(cuid())
  title                   String
  description             String?
  workflowArea            WorkflowArea
  defaultDueTime          String
  requiresManagerApproval Boolean  @default(false)
  isActive                Boolean  @default(true)

  roleId                  String?
  role                    Role?    @relation(fields: [roleId], references: [id], onDelete: SetNull)

  dutyId                  String?
  duty                    Duty?    @relation(fields: [dutyId], references: [id], onDelete: SetNull)

  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@index([workflowArea])
  @@index([roleId])
  @@index([dutyId])
  @@index([isActive])
}
```

If a `WorkflowArea` enum does not already exist, add one that covers the MVP workflow areas:

```prisma
enum WorkflowArea {
  INVENTORY
  ADVERTISING
  MARKETING
  SALES
  ADMIN
  COLLECTIONS
  SHOP
  GENERAL_MANAGER
}
```

If a similar enum already exists, reuse it instead of creating a duplicate.

## Important design notes

* `defaultDueTime` may be stored as a string such as `"09:00"` or another existing project-standard time format. Do not overbuild timezone behavior in this issue. Timezone/generation settings belong to the settings work.
* Do not create generated `Task` records in this issue.
* Do not create `BoardDay`, `Task`, or `GenerationRun` in this issue unless they already exist and need only relationship wiring.
* Do not implement API routes or UI for managing templates. That belongs to DB-019.
* Do not implement daily generation logic. That begins in later DB-022/DB-023 work.
* Keep this change database/schema-focused and reviewable.

## Seed data

If the project already has a seed file and role/duty seed data, add a small set of realistic task templates for local development.

Seed examples may include:

* Inventory Manager: Review inventory status.
* Inventory Manager: Check vehicles ready for photos/listing.
* Mechanic: Update repair status.
* Marketing/Advertisement Manager: Confirm listings are complete.
* Salesperson: Review sales follow-up tasks.
* General Manager: Review blocked tasks.
* General Manager: Review tasks marked Ready for Review.

Use existing seeded role/duty identifiers or lookup by name. Do not hardcode IDs unless the current seed pattern already does that.

If seed data cannot safely be added because earlier role/duty seeds are missing, document that in the summary and leave a clear TODO comment only if the repo already uses TODOs for unfinished seed dependencies.

## Validation / constraints

Add reasonable database-level constraints and indexes without overengineering.

Required:

* `title` must be required.
* `workflowArea` must be required.
* `defaultDueTime` must be required.
* `requiresManagerApproval` should default to `false`.
* `isActive` should default to `true`.
* `roleId` and `dutyId` should be optional.
* Add indexes that support later generation queries by active templates, role, duty, and workflow area.

Optional, only if easy and consistent with existing architecture:

* Add a schema-level uniqueness rule to prevent obvious duplicate active templates for the same role/duty/title combination. Avoid fragile uniqueness if nullable fields would cause Prisma/PostgreSQL edge cases.

## Tests

Add or update tests where appropriate for the current project setup.

Minimum test expectations:

* Prisma/schema validation passes.
* Migration can be generated/applied.
* Seed data can run if templates are added to seeds.
* If the project has database tests, add a simple test proving a template can be created with:

  * workflow area
  * default due time
  * optional role or duty
  * manager approval flag
  * active flag

Do not add a large test framework or new dependency just for this issue.

## Constraints

* Keep the change minimal.
* Follow existing architecture and naming patterns.
* Do not add new dependencies unless necessary.
* Do not rewrite unrelated files.
* Preserve existing behavior.
* Keep business rules ready for server-side use later.
* Do not build DB-019 CRUD in this issue.
* Do not build board generation logic in this issue.
* Do not build template UI in this issue.
* Update docs only if the implemented schema differs meaningfully from `docs/ARCHITECTURE.md`.

## Done when

* `TaskTemplate` exists in the Prisma schema.
* The schema supports role-based and duty-based daily work templates.
* The schema supports workflow area, default due time, manager approval requirement, and active/inactive status.
* A migration exists and applies cleanly.
* Seed data is added if safe based on existing seeded roles/duties.
* Relevant tests, Prisma validation, typecheck, and lint commands pass, or any skipped checks are clearly explained.
* No unrelated code or UI changes are included.
* Summarize:

  * Files changed
  * Schema/model added
  * Migration created
  * Seed data added or skipped
  * Tests/checks run
  * Any remaining work for DB-019
