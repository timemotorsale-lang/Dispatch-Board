# Task: DB-019 Add Task Template CRUD

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DEFAULT_PROMPT.md`, and the relevant existing code first.

## Goal

Implement DB-019: Add task template CRUD.

Build the server-side create, list, update, and deactivate/archive flows for `TaskTemplate` records so managers can manage active task templates without direct database edits.

This should build on DB-018, which should already have added the `TaskTemplate` schema and migration.

## Current behavior

Task template schema should exist from DB-018, but managers do not yet have application-level CRUD flows for creating, listing, editing, or deactivating task templates.

Task templates are not yet manageable through the app/server API.

## Desired behavior

Managers can manage task templates through server-side application flows.

Implement:

1. List task templates

   * Return active templates by default.
   * Support an option/query to include inactive templates if practical.
   * Include useful related data such as linked role and duty names when available.
   * Sort predictably, preferably by workflow area, title, or created date according to existing project patterns.

2. Create task template

   * Manager-only.
   * Validate required fields.
   * Create a new active template.
   * Support the DB-018 fields already defined on `TaskTemplate`, such as:

     * `title`
     * `description`
     * `workflowArea`
     * `defaultDueTime`
     * `requiresManagerApproval`
     * optional `roleId`
     * optional `dutyId`
     * `isActive`

3. Update task template

   * Manager-only.
   * Allow editing core template fields.
   * Preserve existing template IDs so future generated tasks can continue referencing the template.
   * Do not break future duplicate-prevention logic.
   * Validate role and duty references if supplied.

4. Deactivate/archive task template

   * Prefer a soft delete by setting `isActive = false`.
   * Do not hard delete templates by default, because generated tasks may later reference template IDs.
   * If the existing architecture already has a delete pattern, follow it only if it preserves historical references safely.

## Suggested API surface

Use the existing project conventions. If API routes are being used, implement or extend:

* `GET /api/task-templates`
* `POST /api/task-templates`
* `PATCH /api/task-templates/:id`

For deactivation, choose the smallest consistent option:

* Either `PATCH /api/task-templates/:id` with `{ isActive: false }`
* Or a dedicated endpoint only if the project already uses that pattern.

Do not add a new UI unless there is already a minimal manager settings/templates surface that can be safely wired without broad changes. This issue is primarily server-side CRUD plus tests.

## Architecture requirements

Follow the existing repository structure.

Prefer:

* Repository/data access logic in `src/server/repositories`
* Business workflow logic in `src/server/services`
* Permission checks in `src/server/policies`
* Validation in `src/server/validation`
* API route handlers or server actions in the existing route/action pattern

Do not put business rules only inside UI components.

## Permission rules

* Only managers can create, update, or deactivate task templates.
* Non-manager staff should not be able to mutate templates.
* Listing templates should follow the existing permission approach. If the app currently treats templates as manager-only settings data, make list manager-only too.
* Enforce permissions server-side. UI hiding is not enough.

## Validation rules

Validate inputs server-side.

At minimum:

* `title` is required and cannot be blank.
* `workflowArea` is required and must match the existing enum/allowed values if one exists.
* `defaultDueTime` is required and must be a valid time format according to the existing schema.
* `requiresManagerApproval` must be boolean.
* `roleId`, if supplied, must reference an existing role.
* `dutyId`, if supplied, must reference an existing duty.
* `isActive`, if supplied on update, must be boolean.
* Reject unknown or unsafe fields rather than blindly spreading request bodies into Prisma.

If DB-018 already created enums or validation helpers, reuse them.

## Constraints

* Keep the change minimal and scoped to DB-019.
* Do not redesign the task template schema unless DB-018 is clearly incomplete or broken.
* Do not implement daily generation yet.
* Do not implement board/task schemas from DB-020.
* Do not build assignment recommendation logic yet.
* Do not add third-party dependencies unless necessary.
* Do not rewrite unrelated auth, settings, board, or task code.
* Preserve existing behavior.
* Use existing auth/session and manager policy helpers from DB-014 if present.
* If manager policy helpers are missing, use the closest existing permission pattern and note the gap clearly.
* If DB-018 was not implemented, stop and report what is missing before making broad schema changes.

## Tests

Add or update tests according to the existing test setup.

Cover at least:

1. Manager can list task templates.
2. Manager can create a valid task template.
3. Manager can update a task template.
4. Manager can deactivate/archive a task template.
5. Staff/non-manager cannot create, update, or deactivate templates.
6. Invalid create/update payloads are rejected.
7. Invalid `roleId` or `dutyId` references are rejected if those relationships exist.
8. Inactive templates are excluded from default list results if that behavior is implemented.

Use unit tests for service/validation logic and integration tests for API behavior if the project already has those patterns.

## Manual verification

After implementation, verify the app still boots and run the relevant commands available in the repo, such as:

* `npm run lint`
* `npm run typecheck`
* `npm test`

If any command does not exist or cannot run, state that clearly in the final summary.

## Done when

* Managers can list active task templates without direct database edits.
* Managers can create task templates through the server/API flow.
* Managers can update task templates through the server/API flow.
* Managers can deactivate/archive task templates safely.
* Staff/non-manager mutation attempts are rejected server-side.
* Input validation is enforced server-side.
* Relevant tests pass.
* The change is scoped and reviewable.
* No unrelated files are changed.
* Docs are updated only if the actual API behavior, setup, or architecture changed.
* Final response summarizes:

  * Files changed
  * Behavior added
  * Tests/checks run
  * Any known limitations or follow-up work
