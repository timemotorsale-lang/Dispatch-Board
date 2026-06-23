# Task: DB-051 Improve tablet and desktop board layout

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and the relevant board/activity UI files before editing.

Use the existing UI reference image if present, likely at `docs/images/UI_REFERENCE.png` or `UI_REFERENCE.png`, as visual guidance for board structure, spacing, dashboard feel, activity rail, and manager workflow.

## Goal

Improve the tablet and desktop layout of the Dispatch Board so the main board, grouping controls, manager actions, and Today’s Activity Feed are easier to scan and use on larger screens.

This is a responsive UI polish task, not a backend/schema task.

## Current behavior

The board works functionally, but the larger-screen experience needs refinement:

- Board spacing and density may not be optimized for tablet or desktop.
- Grouping/filter controls may feel cramped, scattered, or visually heavy.
- Today’s Activity Feed may not remain visible or useful enough on larger screens.
- The layout may not fully match the approved mockup/reference structure.
- The page may use space inefficiently on desktop or feel awkward on tablet.

## Desired behavior

Improve the board page layout for these breakpoints:

- Tablet: approximately 768px–1024px wide
- Desktop: approximately 1280px and wider
- Large desktop: approximately 1440px and wider

The improved layout should:

1. Keep the full board readable and usable on tablet.
2. Use desktop width efficiently without making task cards too stretched.
3. Keep grouping controls visible, compact, and easy to understand.
4. Make Today’s Activity Feed visible and useful on desktop, preferably as a right-side rail or persistent panel if the current structure supports it.
5. Avoid horizontal overflow at all supported widths.
6. Preserve the existing mobile experience from DB-050.
7. Preserve all existing task actions, grouping modes, filters, status updates, comments, review actions, assignment controls, and activity-feed behavior.
8. Better align the structure with the approved mockup/reference image.

## Implementation guidance

Before changing code:

1. Inspect the current board route/page composition.
2. Identify the board layout components, task card components, grouping/filter controls, manager controls, and activity feed components.
3. Identify existing responsive classes/styles and where tablet/desktop behavior is controlled.
4. Briefly state the implementation plan before editing.

Focus the implementation on layout and styling:

- Prefer editing existing board/layout components instead of creating unnecessary new abstractions.
- Use the project’s existing styling approach.
- Do not add a new UI library.
- Do not change API contracts, data models, task mutation logic, permissions, or activity event logic.
- Keep board state and grouping behavior unchanged.
- Do not remove visible information that managers need to run the day.
- Do not bury important controls behind menus unless they are secondary controls.
- Make the grouping/filter toolbar wrap cleanly on tablet.
- Keep important manager actions reachable without excessive scrolling.
- Keep task cards compact but readable.
- Use consistent spacing, panel sizing, borders, and typography.
- Prefer a clear desktop structure such as:
  - Header / board summary area
  - Grouping and filter toolbar
  - Main board content
  - Activity/review visibility area
- On desktop, avoid the activity feed disappearing below the fold if a side rail is practical.
- On tablet, avoid forcing a narrow three-column layout if it makes the board unreadable.

## Suggested files to inspect

Actual file names may differ, but check likely areas such as:

- `src/app/board/**`
- `src/features/board/**`
- `src/features/activity/**`
- `src/features/tasks/**`
- `src/components/layout/**`
- `src/components/ui/**`
- existing CSS/Tailwind class usage
- any existing tests for board, activity feed, or responsive behavior

## Constraints

- Preserve existing functionality.
- Preserve existing mobile behavior.
- Avoid unnecessary new components.
- Avoid broad rewrites.
- Avoid horizontal overflow.
- Do not add dependencies unless absolutely necessary.
- Do not change server-side business logic.
- Do not change database schema.
- Do not invent new product behavior outside DB-051.
- Keep the patch focused and reviewable.
- If a larger frontend refactor seems necessary, stop and explain why before doing it.

## Tests and verification

Run the relevant checks available in the project, such as:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- any existing component or e2e tests for the board

If browser/e2e tooling exists, verify the board at these viewport sizes:

- 768x1024
- 1024x768
- 1280x800
- 1440x900

If automated viewport testing does not exist, manually inspect these sizes and summarize what was checked.

## Done when

- The board is readable and usable on tablet and desktop.
- Grouping/filter controls remain visible and do not overflow.
- Today’s Activity Feed has improved visibility on larger screens.
- Task cards remain compact, readable, and scannable.
- Existing task, grouping, filtering, review, assignment, comment, and activity-feed behavior still works.
- Mobile behavior from DB-050 is not regressed.
- No unrelated files were changed.
- Relevant checks pass, or any skipped check is clearly explained.
- Summarize:
  - Files changed
  - Layout improvements made
  - Viewports tested
  - Tests/checks run
  - Any remaining UI polish risks