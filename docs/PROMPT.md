# Task: DB-030 — Add board grouping and filtering controls using the approved UI reference mockup

Read these files first:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/DEFAULT_PROMPT.md`
- The current board-related source files
- The approved UI reference mockup, expected at `docs/images/UI_REFERENCE.png` or the closest existing `UI_REFERENCE.png` file in the repo

If the UI reference mockup cannot be found, stop and report that before making visual layout changes.

## Goal

Implement **DB-030 — Add board grouping and filtering controls** for the Time Motor Sales Dispatch Board.

The board must support switching between these grouping modes:

1. Assigned user
2. Status
3. Workflow area

Also add practical board filtering controls that help managers and staff quickly narrow the board without losing visibility of tasks.

Important: Codex has started creating the app with its own UI direction. For this task, update the board UI to follow the approved mockup instead of continuing with an invented Codex layout.

Keep this task **functional first, visual refinement second**. The grouping/filtering behavior must work reliably before polishing small visual details.

## Current behavior

The app currently has an initial board page from earlier v0.4.0 work. Codex may have created a UI layout that does not match the approved mockup.

Before changing code:

1. Inspect the current board page.
2. Identify the board route, board components, task card components, board data loading, current grouping/filter state if any, and existing tests.
3. Identify what behavior already works and must be preserved.
4. Confirm whether grouping/filtering should happen client-side from the current board read model or server-side through existing API/query params.

Do not rewrite the board from scratch unless the current structure is unusable. Prefer adapting the existing implementation.

## Desired behavior

The board page should allow the user to switch grouping modes without losing task visibility.

### Required grouping modes

Add a clear board control for:

- **Group by Assignee**
- **Group by Status**
- **Group by Workflow Area**

Each mode should render task groups/columns/sections based on the selected grouping.

### Grouping behavior

- Grouping by assignee should show tasks under assigned staff members.
- Grouping by status should show tasks under statuses such as Not Started, In Progress, Blocked, Waiting on Parts, Waiting on Approval, Ready for Review, and Completed.
- Grouping by workflow area should show tasks under areas such as Inventory, Advertising, Marketing, Sales, Admin, and Collections/basic manual work.
- Tasks with missing or unknown grouping values should still appear under an “Unassigned,” “No Status,” or “Other” group instead of disappearing.
- Switching grouping modes should not mutate task data.
- Switching grouping modes should not reset the board date.
- Switching grouping modes should not permanently hide tasks.
- Empty groups may be hidden unless the current UI pattern makes empty groups useful.

### Filtering controls

Add filtering controls that fit the current data model and board read model.

Preferred filters:

- Status
- Assignee
- Workflow area
- Search text, if task title/description/vehicle/customer text is available in the board data

Filtering behavior:

- Filters should be easy to clear.
- A “Clear filters” action should reset all filters back to the default all-visible state.
- Filters should work together predictably.
- When filters produce no results, show a useful empty state such as: “No tasks match these filters.”
- Filtering should not delete or mutate task records.
- Filtering should not interfere with future task editing or status updates.

### Task visibility requirement

DB-030 is not done unless the board can switch between planned grouping modes while preserving visibility of all matching tasks.

No task should disappear unless it is intentionally filtered out.

## Visual guidance from mockup

Use the approved UI reference mockup as the visual source of truth for the board screen.

The UI should move away from Codex’s self-created layout and toward the mockup direction.

Apply the mockup guidance to:

- Overall enterprise-level clean layout
- Left navigation/sidebar
- Board header and daily board context
- Board controls near the header
- Grouping and filtering controls
- Compact task card hierarchy
- Clear status/priority/metadata treatment
- Reduced clutter
- Right-side Today’s Activity Feed rail when viewport width allows
- Responsive fallback for tablet and mobile

Preserve the app name exactly as:

**Time Motor Sales Dispatch Board**

Use the mockup as guidance, not as permission to overbuild the UI. The goal is to align the current board page with the approved direction while keeping this task scoped to DB-030.

### Layout expectations

On desktop:

- Keep a left sidebar/navigation area if the app already has one.
- Keep the main board area central and easy to scan.
- Place grouping/filtering controls near the board title/header.
- Keep task cards compact.
- Keep Today’s Activity Feed visible as a right-side rail if the current implementation already has activity data or a placeholder rail.
- Avoid oversized controls and excessive spacing.

On tablet:

- The board should remain readable and usable.
- Controls may wrap cleanly.
- The activity rail may move below or collapse if needed.

On mobile:

- Prioritize “my tasks,” quick scanning, and grouped sections.
- Filters/grouping controls should remain usable without horizontal overflow.
- The right rail should not force the layout off-screen.

## Scope constraints

- Keep the change focused on DB-030.
- Do not implement DB-031 or DB-032 manual task creation unless minimal existing buttons need to remain wired.
- Do not implement task detail, staff status updates, comments, review approvals, or activity feed persistence as part of this task.
- Do not add new database models.
- Do not change Prisma schema unless the existing board read model cannot support grouping/filtering and you explain why first.
- Do not add new dependencies unless clearly necessary and justified.
- Do not rewrite unrelated routes, auth, generation services, settings, or task mutation logic.
- Preserve existing board data loading.
- Preserve existing permissions.
- Preserve existing tests.
- Use existing design/components/patterns where practical, but update the board page to align with the approved mockup.

## Implementation guidance

Recommended approach:

1. Inspect the current board implementation.
2. Locate the board route/page and board feature components.
3. Locate the task card component or create a small board-specific card only if needed.
4. Locate the board read model shape.
5. Add a small typed grouping/filtering helper if one does not already exist.
6. Add client-side grouping/filtering first if the current board dataset is already loaded and not paginated.
7. If board data is paginated or too large for client-only filtering, extend the existing board API minimally with query params.
8. Add UI controls for grouping and filtering near the board header.
9. Update the board layout to follow `UI_REFERENCE.png`.
10. Add empty/loading/error states if the current board surface lacks them.
11. Add or update tests for grouping/filter behavior.
12. Run relevant checks.

Suggested grouping helper behavior:

- Input: list of tasks, selected group mode, selected filters, search text.
- Output: ordered groups with group label, group key, task count, and filtered tasks.
- Unknown values should map to a safe fallback group.
- The helper should be unit-testable if the project has unit tests set up.

Suggested group ordering:

- Status: Not Started, In Progress, Blocked, Waiting on Parts, Waiting on Approval, Ready for Review, Completed, Other
- Workflow area: Inventory, Advertising, Marketing, Sales, Admin, Collections, Other
- Assignee: active users/alphabetical if user metadata exists; otherwise grouped by assigned user name or ID with Unassigned last

## Edge cases to handle

Test or manually verify:

- No board exists for the selected date.
- Board exists but has no tasks.
- Tasks exist with missing assignee.
- Tasks exist with missing workflow area.
- Filters return zero tasks.
- Clearing filters restores all tasks.
- Search is case-insensitive if search is implemented.
- Switching grouping modes preserves active filters unless there is a strong UX reason to reset them.
- Mobile viewport does not horizontally overflow.
- Existing task cards still show key information such as title, assignee, status, due time, workflow area, and vehicle/customer reference when available.

## Done when

- DB-030 grouping modes work:
  - Assigned user
  - Status
  - Workflow area
- Board filtering controls work and can be cleared.
- Switching grouping modes does not lose task visibility.
- Unknown/missing group values do not cause tasks to disappear.
- The board UI is updated to follow the approved `UI_REFERENCE.png` mockup direction.
- The board remains responsive on desktop, tablet, and mobile.
- Loading, empty, and error states are present or existing ones are preserved.
- Existing board data loading still works.
- Existing behavior from DB-028 and DB-029 is preserved.
- Relevant tests are added or updated where practical.
- Relevant lint/typecheck/test commands are run.
- No unrelated files are changed.
- The final summary includes:
  - Files changed
  - Behavior added
  - UI changes made from the mockup
  - Tests/checks run
  - Any checks that could not be run
  - Remaining risks or follow-up recommendations

## Final self-review before finishing

Before reporting done, review your own diff for:

1. Unrelated edits
2. Broken board data loading
3. Task visibility regressions
4. Filter reset bugs
5. Responsive overflow
6. Missing empty states
7. UI drift away from the approved mockup
8. Unnecessary new abstractions
9. Missing tests where tests were practical

Fix only issues directly related to DB-030.