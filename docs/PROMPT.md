# Task

DB-052 Add loading, empty, and error states

# Goal

Harden the Dispatch Board UI so users can clearly tell when the app is loading, has no data to show, or encountered a recoverable error.

Focus on the core surfaces already built:

- Today's Board / date-based board page
- Staff "My Tasks" view
- Task detail view
- Manual generation trigger/status surface
- Activity feed
- Review queue / manager visibility surfaces if present
- Any shared board/task data-fetching components that currently render broken, blank, or misleading UI during loading/failure states

# Context

Read these files first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- Existing board, task, activity, generation, and review UI files
- Existing tests for board/task/review/activity workflows
- `docs/images/UI_REFERENCE.png` or the current UI reference image if present in the repo

DB-052 belongs to `v0.6.0 - Reliability and release readiness`.

The roadmap scope is:

> Add loading, empty, and error states.

Acceptance criteria:

> Users can tell when the app is loading, empty, or failing instead of seeing broken UI.

Architecture expectations:

- Use the existing Next.js / React / TypeScript patterns.
- Keep business rules server-side.
- Do not change permission rules, task status rules, recommendation logic, generation logic, or activity persistence.
- The activity feed is event-backed and should not be faked from UI-only state.
- Failure states should be visible and retryable when reasonable.

# Current behavior

Some UI surfaces may currently show one or more of these problems:

- Blank space while data is loading
- Broken layout if the board has no tasks
- Empty activity feed without explanation
- Task detail surfaces that fail unclearly when the task cannot be found or cannot be loaded
- Generation controls that do not clearly show pending, failed, or retryable states
- Error messages that are too technical, too hidden, or inconsistent
- Repeated loading/error UI implemented differently across features

# Desired behavior

Implement consistent, honest UI states across the app.

## Loading states

Add lightweight loading states where data is being fetched or an action is pending.

Cover at least:

- Board data loading
- Task detail loading
- Staff task list loading
- Activity feed loading
- Manual generation request pending
- Review queue loading if present

Use existing visual language. Prefer simple skeletons, muted cards, spinners, or inline pending messages based on current project patterns. Do not introduce a new UI library.

## Empty states

Add useful empty states when a request succeeds but there is nothing to show.

Cover at least:

- No board exists for the selected date
- Board exists but has no tasks
- No tasks match the current filters/grouping
- Staff user has no assigned tasks
- No activity events for the selected date
- No tasks waiting for review
- Task comments empty if the comments surface exists

Empty states should explain what happened and, where appropriate, offer a next action:

- Manager: generate today's board, create a task, clear filters
- Staff: no assigned tasks yet, check full board, create own task if that feature exists
- Activity feed: no activity has been recorded yet
- Review queue: no tasks are ready for review

## Error states

Add user-facing error states for failed requests and failed actions.

Cover at least:

- Board fetch failure
- Task detail fetch failure
- Activity fetch failure
- Manual generation failure
- Status update / task action failure if currently silent
- Task not found or unavailable
- Unauthorized/forbidden responses if currently displayed poorly

Error states should:

- Use plain language
- Avoid exposing stack traces or raw server internals
- Preserve the surrounding layout when possible
- Include a retry action where practical
- Keep the user oriented: what failed, what they can try next, and whether work may still be saved

# Implementation guidance

1. Inspect existing data-fetching and server action patterns before editing.
2. Identify shared opportunities first:
   - If the app already has shared UI primitives, reuse them.
   - If not, add small reusable components only if they reduce duplication, such as:
     - `LoadingState`
     - `EmptyState`
     - `ErrorState`
     - `InlinePendingState`
   - Keep these components simple and project-local.
3. Do not redesign the app. This is reliability polish, not a structural UI rewrite.
4. Preserve the current visual direction from the reference mockup:
   - Clean operational dashboard feel
   - Clear board areas
   - Readable task cards
   - Activity rail/feed remains easy to scan
   - No horizontal overflow
5. Make retry actions call the existing fetch/mutation path rather than duplicating business logic.
6. Make action-level pending states prevent accidental repeated clicks where appropriate, especially manual generation and task status updates.
7. Keep error handling close to the relevant UI boundary, but do not swallow server errors silently.
8. If a route-level `loading.tsx`, `error.tsx`, or `not-found.tsx` is appropriate in the current Next.js structure, add it narrowly for the relevant route only.
9. Add or update tests only where the existing test setup supports it without a broad test architecture change.

# Constraints

- Keep the patch minimal and reviewable.
- Do not add dependencies unless absolutely necessary.
- Do not rewrite the board layout or task workflow.
- Do not change database schema unless you find a direct, unavoidable reason; explain first if so.
- Do not change server-side business rules.
- Do not change authorization behavior.
- Do not remove existing functionality.
- Do not introduce fake placeholder data in production-facing states.
- Do not hide real failures by treating errors as empty states.
- Preserve responsive behavior on mobile, tablet, and desktop.
- Avoid horizontal overflow.
- Follow existing styling conventions.

# Edge cases to handle

Test the UI manually against these cases where possible:

- Slow board request
- Board API returns no board for selected date
- Board exists with zero tasks
- Filters produce zero visible tasks
- Staff user has no assigned tasks
- Activity feed returns zero events
- Activity feed request fails
- Task detail request fails
- Task is missing/not found
- Manual generation succeeds
- Manual generation fails
- Manual generation is clicked repeatedly while pending
- Status update or comment submission fails
- Mobile viewport still remains readable

# Tests

Add or update tests where practical based on the current setup.

Prefer focused tests such as:

- Board page renders loading, empty, and error states
- Activity feed renders empty and error states
- Task detail handles missing/not-found task state
- Manual generation button shows pending state and failure feedback
- Filtered board empty state appears when filters hide all tasks

If the current testing setup does not make a specific UI state easy to test, do not create a large new testing framework in this task. Instead, add the most valuable low-friction tests and clearly report what remains manual.

# Done when

- Board, task, generation, and activity surfaces no longer show blank or broken UI during loading, empty, or failed states.
- Empty states use helpful operational copy and appropriate next actions.
- Error states are visible, plain-language, and retryable where practical.
- Pending states prevent confusing duplicate actions where relevant.
- Mobile, tablet, and desktop layouts remain usable.
- Existing workflows still work.
- Relevant tests pass.
- Lint/typecheck pass if available.
- No unrelated files were changed.
- Summarize:
  - Files changed
  - UI states added
  - Tests run
  - Manual checks performed
  - Any remaining gaps