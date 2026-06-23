# Task

DB-050 Improve mobile staff task experience

# Goal

Refine the existing staff-facing task experience so a staff member can comfortably use the Dispatch Board from a phone-sized viewport during a normal workday.

This task should improve fast reading, quick status changes, blocker updates, and comments on mobile without changing the underlying task workflow rules.

# Context

Read these files first:

- `docs/AGENTS.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- Existing staff task view files
- Existing task detail files
- Existing task status/comment UI files
- Existing board/task API or server-action files only as needed
- `docs/images/UI_REFERENCE.png` or the project UI reference image if present

Roadmap item:

- `DB-050 Improve mobile staff task experience`
- Scope: refine the mobile task view for fast reading, status changes, and comments.
- Acceptance criteria: staff can update tasks comfortably from a phone-sized viewport.

Product/UX direction:

- Mobile should prioritize:
  - My tasks
  - Quick status changes
  - Task detail
  - Blocker updates
  - Comments
  - Activity/feed access when available
- Staff updates must stay low-friction.
- The MVP is a responsive web app, not a native mobile app.
- Preserve the existing server-side permission and validation rules.

# Current behavior to inspect

Before editing, inspect the current implementation and identify:

1. Where the staff “my tasks” page/view is implemented.
2. Where task cards or task rows are rendered.
3. Where task detail is rendered.
4. Where status changes are submitted.
5. Where blocker reason input appears.
6. Where comments are displayed and added.
7. Whether the layout has horizontal overflow or cramped controls at phone widths.

Do not make code changes until you have identified the relevant files and written a short implementation plan.

# Desired behavior

At mobile widths, the staff task experience should feel like a focused daily work app:

1. Staff can quickly see their own tasks first.
2. Each task card should clearly show:
   - Title
   - Status
   - Due time
   - Workflow area or source, if available
   - Vehicle/customer reference, if available
   - Blocker/review state when relevant
3. Primary actions should be easy to tap:
   - Start / move to In Progress
   - Mark Blocked
   - Mark Waiting on Parts
   - Mark Waiting on Approval
   - Mark Ready for Review
   - Complete when allowed
   - Add comment/update
4. Blocked status must still require a blocker reason.
5. Approval-required tasks must still route through Ready for Review.
6. Comments should be readable and easy to add without hunting through the page.
7. Mobile layout must avoid horizontal scrolling.
8. Important actions should remain visible without requiring the user to understand the full desktop board layout.
9. Desktop and tablet layouts should not regress.

# Implementation guidance

Prefer a focused responsive refinement over a broad redesign.

Suggested approach:

1. Inspect the current staff task components and reuse existing components where possible.
2. Add or refine mobile-specific layout behavior using the project’s existing styling system.
3. Consider a mobile-first task card layout:
   - Compact task summary
   - Clear status badge
   - Due time near the top
   - One primary status action area
   - Secondary actions grouped or collapsed if space is tight
4. Keep form controls large enough for phone use.
5. Make comments and blocker reason inputs easy to reach from the task detail or task card.
6. Avoid duplicating business logic in the UI.
7. Keep status transition rules enforced by the existing server action/API.
8. Avoid adding a new dependency unless absolutely necessary.
9. Use the UI reference image for general structure, spacing, and visual direction, but do not force a pixel-perfect rewrite if it risks breaking existing functionality.

# Constraints

- Keep the change scoped to DB-050.
- Do not build a native mobile app.
- Do not add PWA install behavior in this task.
- Do not redesign the whole desktop board.
- Do not change task status rules.
- Do not weaken permission checks.
- Do not bypass blocker-reason validation.
- Do not allow staff to edit or reassign other staff members’ tasks.
- Do not introduce unrelated backend/schema changes.
- Do not add new dependencies unless you explain why first.
- Preserve existing tests and existing desktop/tablet behavior.
- Avoid horizontal overflow at common mobile widths.

# Suggested viewport checks

Manually inspect or test at these widths if the project tooling allows:

- 375px wide
- 390px wide
- 414px wide
- 768px wide
- Desktop width already used by the app

# Tests / checks

Run the relevant available commands, such as:

- `npm test`
- `npm run typecheck`
- `npm run lint`

If the project has browser or component tests for the staff task view, add or update focused coverage for mobile behavior where practical.

At minimum, verify:

1. Staff can view their own tasks on a phone-sized viewport.
2. Staff can update an allowed status.
3. Blocked still requires a blocker reason.
4. Approval-required tasks still cannot be completed directly by staff.
5. Staff can add a comment/update.
6. No horizontal overflow appears on the staff task view or task detail page.
7. Desktop/tablet board layout is not broken.

# Done when

- DB-050 acceptance criteria are met.
- Staff can update tasks comfortably from a phone-sized viewport.
- The mobile staff task view is faster to scan and easier to act on.
- Comments and blocker updates are easy to use on mobile.
- Existing status, blocker, approval, and permission rules still work.
- No unrelated files were changed.
- Relevant tests/checks pass, or any skipped check is clearly explained.
- Summarize:
  - Files changed
  - Mobile UX improvements made
  - Tests/checks run
  - Any remaining limitations