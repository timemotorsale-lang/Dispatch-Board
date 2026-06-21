# Classification

Full vertical slice.

Reason: these four roadmap items span server validation, task reads and mutations, permissions, board-facing UI, and tests, and they build directly on the already-implemented board and auth foundation.

# Judgment

Implement these together as one Codex task.

Why: the repo already has working auth, board read endpoints, board generation, grouping/filtering controls, and a placeholder task surface, so this is a reasonable next vertical slice as long as the task detail UI stays minimal and the scope does not expand into comments, approval review flows, or broader task editing.

# Prompt

# Task

Implement the following roadmap items in one focused vertical slice:

`DB-031 Add manual task creation API`  
`DB-032 Add manual task creation UI`  
`DB-033 Add task detail endpoint and read model`  
`DB-034 Add staff status update endpoint`

# Goal

Deliver the next usable task-workflow slice for the Dispatch Board MVP:

- Managers can create manual tasks from the app.
- Manual task creation validates required fields, especially title, assigned user, due time, status, workflow area, and optional vehicle/customer references.
- The app can load a single task detail read model reliably.
- Staff can update the status of their own assigned tasks through validated server logic.
- Server-side permissions and validation remain the source of truth.

# Context

Read these before editing:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/MVP_SCOPE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/images/UI_REFERENCE.png`

Inspect the current implementation before changing anything. Relevant existing areas include:

- `src/app/(app)/board/page.tsx`
- `src/app/(app)/tasks/page.tsx`
- `src/app/api/board/today/route.ts`
- `src/app/api/board/[date]/route.ts`
- `src/features/board/board-screen.tsx`
- `src/features/board/board-toolbar.tsx`
- `src/server/services/board-read.ts`
- `src/server/repositories/board-read-repository.ts`
- `src/server/services/board-generation.ts`
- `src/server/policies/access.ts`
- `src/server/validation`
- existing unit tests under `src/tests/unit`

This slice follows DB-028, DB-029, and DB-030. Preserve the existing board read API, the current board page, grouping/filtering controls, manager-only board generation, and the current UI direction.

# Current behavior

Verify the actual baseline from the codebase and preserve it:

- The board already loads real board data through `/api/board/today` and `/api/board/[date]`.
- Managers and staff can view the board when authenticated.
- The board already supports grouping and filtering in the UI.
- Managers already have a manual board generation control with feedback.
- The board layout already reserves a right-side rail for future activity/feed work.
- The `/tasks` route currently exists as a protected placeholder rather than a real task workflow surface.
- Manual task creation, single-task detail loading, and staff status updates are not implemented yet.

Do not assume planned roadmap features already exist just because they appear in docs. Confirm behavior from the codebase first.

# Desired behavior

## Manual task creation API

- Add or complete the server/API path for creating manual tasks.
- Require a task title.
- Require due time.
- Require assigned user unless the existing domain model explicitly supports manager-review-needed unassigned tasks. If the current Prisma schema still requires `assignedUserId`, preserve that invariant.
- Require workflow area.
- Support description/notes if the existing task model supports it.
- Support optional vehicle/customer text fields.
- Allow an initial valid MVP status if appropriate, but do not bypass server-side validation.
- Set `sourceType` to manager/manual or the existing equivalent for manager-created tasks.
- Apply manager-only permission for manager-created manual tasks unless the existing policy already supports a clearly implemented staff self-task flow in the same codebase.
- Do not let manual task creation interfere with generated-task duplicate prevention.
- If durable activity-event infrastructure does not exist yet, do not invent a half-built subsystem. Follow the repo's existing pattern and leave a clear TODO only where necessary.

## Manual task creation UI

- Add manager-facing task creation controls to the board or task surface using the existing UI structure.
- Keep the UI compact, clean, and aligned with `docs/images/UI_REFERENCE.png`.
- Prefer a drawer, modal, compact panel, or board-level action that does not clutter the board.
- Show validation errors clearly.
- Show success and failure feedback clearly.
- Refresh the board or update local state after task creation.
- Preserve grouping/filtering behavior and the current board layout.
- Keep the right-side rail or its placeholder intact unless a very small adjustment is needed.

## Task detail endpoint and read model

- Add or complete a single-task detail read endpoint/server action.
- Return the fields needed for a minimal but real task detail surface:
  - title
  - description
  - status
  - due time
  - assigned user
  - recommended user if available
  - workflow area
  - vehicle/customer references
  - source information
  - blocker reason
  - review fields
  - timestamps
- Include comments/activity fields only if they are already supported by the current schema and service layer.
- Enforce authenticated visibility according to existing board visibility rules.
- Keep the read model typed and stable.

## Staff status update endpoint

- Add or complete a validated task-status update server path.
- Staff can update only their own assigned tasks.
- Managers can update tasks according to existing manager policy.
- Use the allowed MVP statuses already present in the schema:
  - `NOT_STARTED`
  - `IN_PROGRESS`
  - `BLOCKED`
  - `WAITING_ON_PARTS`
  - `WAITING_ON_APPROVAL`
  - `READY_FOR_REVIEW`
  - `COMPLETED`
- If moving to `BLOCKED` already requires a blocker reason because of the schema or shared validation, preserve that behavior.
- If approval-required completion rules are only partially implemented in current policy helpers, preserve honest behavior and leave DB-036 for the remaining review-rule enforcement rather than pretending it is finished.
- Do not fully implement DB-035 or DB-036 beyond what is directly necessary for DB-034.

# Visual guidance from mockup

Use `docs/images/UI_REFERENCE.png` as the visual direction when shaping task creation and any minimal task detail surface.

Priorities:

- Keep the board as the main operational command center.
- Preserve a clean enterprise-style layout.
- Avoid cluttering the board with too many always-visible controls.
- Make the create-task action easy for managers to find.
- Make status updates fast for staff.
- Preserve responsive behavior.
- Avoid horizontal overflow.
- Reuse existing components and styling patterns before adding new ones.

# Constraints

- Keep the change minimal and reviewable.
- Follow the existing project architecture and naming patterns.
- Keep business rules server-side.
- UI hiding is not enough; enforce permissions in the server path.
- Do not rewrite unrelated board, auth, generation, settings, or layout code.
- Do not add new dependencies unless clearly necessary.
- Do not broadly implement future roadmap items.
- Do not build a customer database or vehicle database; keep references as optional text.
- Preserve generated-task behavior and duplicate-prevention behavior.
- Preserve existing tests.
- Add or update tests where appropriate.

# Implementation guidance

1. Inspect current task-related schema, board read patterns, route patterns, policy helpers, and validation patterns before writing new code.
2. Identify the smallest set of files needed.
3. Implement the server-side manual task creation flow first.
4. Add the single-task detail read model and endpoint next.
5. Add the status update endpoint with permission checks and validation.
6. Add manager-facing task creation UI last, wiring it to the existing board experience.
7. Keep task detail UI minimal unless the codebase already suggests a clear existing surface for it.
8. Reuse current error-handling patterns used by existing board/settings/task-template routes and services.
9. Add focused tests for the new service and route behavior.

# Tests

Add or update tests for at least these cases:

- successful manager manual task creation
- rejected task creation without due time
- rejected task creation without required title
- rejected task creation without required assignment if assignment remains required by the schema
- task detail read returns the expected shape
- staff can update their own assigned task status
- staff cannot update another staff member's task
- blocked status is rejected without a blocker reason if that rule is enforced in this slice

# Done when

- `DB-031` manual task creation API works with required validation.
- `DB-032` managers can create manual tasks from the app without direct API calls.
- `DB-033` the app can load an individual task detail read model reliably.
- `DB-034` staff can update only their own assigned task status through validated server logic.
- Errors are shown clearly in the UI.
- The board updates after manual task creation.
- Existing board grouping/filtering behavior still works.
- Relevant tests pass.
- Typecheck/lint pass if available.
- No unrelated files are changed.
- The final summary includes:
  - files changed
  - behavior added
  - tests run
  - any known gaps intentionally deferred to DB-035, DB-036, DB-038, DB-039, or DB-040
