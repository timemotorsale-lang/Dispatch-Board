# Task

DB-042 Emit events for generation and task lifecycle

# Goal

Wire the existing ActivityEvent model and persistence helpers from DB-041 into the core generation and task lifecycle workflows so important workflow changes create durable, queryable activity events.

This task should make the activity feed trustworthy later, but it should not build the activity feed API or UI yet.

# Context

Read these first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- Relevant files from DB-041 activity event schema/persistence
- Relevant generation service files from DB-022 through DB-027
- Relevant board/task workflow files from DB-031 through DB-040
- Relevant task comment files from DB-038 and DB-039, if implemented

Roadmap item:

- `DB-042 Emit events for generation and task lifecycle`
- Scope: write activity events during generation, assignment, status, due-time, and comment operations.
- Acceptance: important workflow changes create durable activity events.

Architecture expectations:

- Activity events are service-backed, not inferred from UI state.
- ActivityEvent should include board day, optional actor, optional task, event type, message, metadata, and timestamp.
- Every status change should create an ActivityEvent.
- API/service operations that mutate tasks should log activity events in the same operation that changes state.

# Important assumption to verify first

DB-041 should already have added the ActivityEvent schema and persistence helpers.

Before coding, inspect the current implementation and verify:

1. The `ActivityEvent` model exists.
2. There is an activity repository or service/helper for creating events.
3. Existing tests for DB-041 pass or are present.
4. Event types/constants already exist, or there is an obvious place to add them.

If DB-041 is missing or incomplete, stop and report what is missing instead of silently rebuilding DB-041 inside this task.

# Event coverage required

Implement event emission for these workflows where the corresponding operations already exist:

## Generation events

Emit events when:

- Daily board generation completes successfully.
- Generated tasks are created, if the current service can do this without noisy duplication.
- Assignment recommendations are made during generation, if recommendation data already exists.
- Generation fails only if the existing generation flow has enough board/date context to attach the event safely.

At minimum, successful generation should create one durable system event similar to:

- `DAILY_BOARD_GENERATED`

Include useful metadata such as:

- board date
- triggered by `manual` or `scheduled`
- generation run id, if available
- number of tasks created
- number of duplicates skipped
- number of users/templates considered, if already tracked

Do not create duplicate generation events on idempotent retries unless a new generation run actually occurred.

## Task creation events

Emit events when:

- A manager creates a manual task.
- A staff user creates their own task.
- Generated task creation should be handled by the generation event strategy above.

Suggested event types:

- `TASK_CREATED`
- `TASK_GENERATED`, only if the project already distinguishes this cleanly and tests can avoid noisy duplication.

Metadata should include relevant non-sensitive fields:

- title
- assigned user id
- recommended user id, if present
- source type
- workflow area
- due time
- requires manager approval

## Assignment events

Emit events when:

- A task is assigned.
- A task is reassigned.
- A manager accepts or overrides a recommendation, if that endpoint/service already exists.

Suggested event types:

- `TASK_ASSIGNED`
- `TASK_REASSIGNED`
- `ASSIGNMENT_CHANGED`
- `ASSIGNMENT_RECOMMENDATION_MADE`, only if recommendation emission is already supported by existing workflow data.

Metadata should include:

- previous assigned user id
- new assigned user id
- recommended user id, if applicable
- reason code/text, if already available
- changed fields

## Status lifecycle events

Emit events when task status changes.

Status changes should produce both a general status-change event and, when useful, a more specific lifecycle event.

At minimum:

- `TASK_STATUS_CHANGED`

For important statuses, also support specific event types if the existing event-type style allows it:

- `TASK_BLOCKED`
- `TASK_WAITING_ON_PARTS`
- `TASK_WAITING_ON_APPROVAL`
- `TASK_READY_FOR_REVIEW`
- `TASK_COMPLETED`
- `MANAGER_APPROVED_COMPLETION`

Metadata should include:

- previous status
- new status
- blocker reason when status is `Blocked`
- ready for review timestamp when applicable
- completed timestamp when applicable
- reviewed by user id when applicable

Preserve all existing validation rules:

- `Blocked` still requires a blocker reason.
- Approval-required tasks still cannot be completed directly by staff.
- Staff can update only their own assigned tasks.
- Managers retain review and override authority.

## Due-time events

Emit events when a task due time changes.

Suggested event type:

- `TASK_DUE_TIME_CHANGED`

Metadata should include:

- previous due time
- new due time
- changed by actor

Do not emit this event if an update request sends the same due time and no actual change occurs.

## Comment events

Emit events when a task comment/update is added.

Suggested event type:

- `TASK_COMMENT_ADDED`

Metadata should include:

- comment id
- author user id
- short preview/snippet if the project already uses this pattern

Do not store large comment bodies redundantly in event metadata unless existing project conventions already do that.

# Implementation guidance

1. Locate the existing mutation paths for:
   - board generation
   - manual task creation
   - task assignment/reassignment
   - task status update
   - task due-time update
   - task comment creation

2. Prefer a single server-side activity logging helper, for example:
   - `createActivityEvent(...)`
   - `logActivityEvent(...)`
   - `activityService.record(...)`

3. Keep event creation inside the same service transaction as the state change where practical.
   - If the task update succeeds, the corresponding event should succeed.
   - Avoid patterns where the task changes but the event silently fails later.

4. Use existing Prisma transaction patterns if they already exist.
   - Do not add a new transaction abstraction unless necessary.
   - Do not add new dependencies.

5. Keep messages human-readable but concise.
   Examples:
   - `Daily board generated`
   - `Task created: Confirm listings are complete`
   - `Status changed from In Progress to Blocked`
   - `Task marked Ready for Review`
   - `Comment added`

6. Use structured metadata for details the UI or API may need later.
   - Avoid sensitive customer data.
   - Vehicle/customer text references can be included only if already part of task context and not excessive.

7. If event type constants/enums exist, extend them.
   If not, add a small central list/type in the existing activity feature/server area.

8. Do not build DB-043 activity feed retrieval.
9. Do not build DB-044 activity feed UI.
10. Do not implement DB-045 recommendation matching rules unless needed to log existing recommendation outputs.

# Constraints

- Keep this change minimal and scoped to DB-042.
- Do not rewrite generation, task, comment, or assignment logic broadly.
- Do not change user-facing UI.
- Do not change permission behavior except to preserve existing server-side checks.
- Do not add new dependencies.
- Do not create duplicate events for no-op updates.
- Do not log events from client components.
- Do not infer activity from read models; write events from mutation services.
- Do not store secrets, real customer data, or excessive free-text bodies in metadata.
- Preserve existing tests.
- Add or update tests for event emission.

# Tests to add or update

Add focused tests around the server/service layer or API integration layer, following existing test patterns.

Cover at minimum:

1. Manual task creation creates a `TASK_CREATED` activity event.
2. Staff status update creates a status-change event.
3. Moving a task to `Blocked` with a blocker reason creates a blocked/status event containing the reason in metadata.
4. Attempting to move a task to `Blocked` without a blocker reason still fails and does not create an event.
5. Approval-required task flow creates a `READY_FOR_REVIEW` event when staff submits for review.
6. Manager completion/approval creates a completed or manager-approved event.
7. Comment creation creates a comment-added event.
8. Due-time change creates a due-time-changed event only when the value actually changes.
9. Successful generation creates a daily-board-generated event with generation summary metadata.
10. Re-running idempotent generation does not create duplicate task-created events for skipped duplicate generated tasks.

If some workflows are not implemented yet, add tests only for the existing workflows and clearly list the skipped workflows in the final summary.

# Done when

- Important generation and task lifecycle mutations create durable `ActivityEvent` records.
- Events include the correct `boardDayId`, actor when applicable, task when applicable, event type, message, metadata, and timestamp.
- Event creation is server-side and tied to the same mutation workflow that changes state.
- Existing validation and permission rules still pass.
- No duplicate events are created for no-op updates.
- Relevant tests pass.
- Typecheck and lint pass, if available.
- `docs/ARCHITECTURE.md` or related docs are updated only if the implemented event behavior differs from the current documented architecture.
- Final response summarizes:
  - Files changed
  - Event types added/used
  - Workflows now emitting events
  - Tests added/updated
  - Commands run
  - Any workflows intentionally deferred because the underlying operation does not exist yet