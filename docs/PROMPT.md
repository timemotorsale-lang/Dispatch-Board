I am working on the `v0.4.0 - Board and task workflow` branch for the Time Motor Sales Dispatch Board.

The previous UI alignment pass improved the app, but it still does not accurately match the approved mockup. I now want a stronger, structural frontend redesign that closely follows the reference mockup instead of lightly adapting the current UI.

# Task

Rebuild the frontend UI structure to strongly match the approved Dispatch Board mockup.

# Classification

Frontend architecture + structural UI redesign.

Reason: The current app is visually closer than before, but the layout, hierarchy, shell, board structure, navigation, and right-side operational rail still do not accurately represent the approved mockup. This requires structural frontend changes, not minor CSS polish.

# Primary Reference

Use this as the source of truth:

* `docs/images/UI_REFERENCE.png`

Also read:

* `docs/AGENTS.md`
* `docs/ARCHITECTURE.md`
* `docs/ROADMAP.md`
* `docs/PRODUCT_SPEC.md`
* `docs/MVP_SCOPE.md`

The MVP requires a board-first workflow where managers can see the full team board, due times, grouped tasks, blocked/waiting/review work, and activity visibility. The UI must support that daily operating model.

# Goal

Rebuild the app’s frontend structure so the website strongly adheres to the approved mockup.

This is not a small visual polish task.

The finished UI should feel like the mockup’s actual product structure:

* Left sidebar navigation
* Enterprise dashboard shell
* Top board header
* Daily board title and date/operational context
* Summary metric cards across the top
* Board grouping/filter controls
* Main task board/table area
* Clear task rows/cards with status, owner, due time, workflow, and urgency
* Right-side operational rail
* Manager attention/review area
* Appointments/visibility area if supported or represented as placeholder
* Today’s Activity Feed visible in the right rail
* Clean spacing, restrained colors, strong hierarchy, and professional dealership operations feel

The UI should look intentionally designed around `UI_REFERENCE.png`, not like the old UI with small styling changes.

# Current Problem

The current UI does not accurately represent the mockup’s structure.

Likely issues include some or all of the following:

* App shell does not match the reference.
* Sidebar/navigation structure is not close enough.
* Board layout is too generic.
* Main board area does not match the mockup’s hierarchy.
* Right rail is missing, weak, misplaced, or not structurally similar.
* Summary cards and board controls do not match the intended flow.
* Task display does not feel like the approved operational board.
* The UI still feels generated rather than designed from the reference.

# Important Direction

You have permission to make deeper frontend changes.

You may:

* Reorganize frontend components.
* Replace the current board layout.
* Create a stronger app shell.
* Create new layout components.
* Create new UI primitives.
* Change frontend folder organization if justified.
* Replace or restructure CSS/Tailwind usage.
* Add a frontend UI library if it materially helps match the mockup.
* Add a table/layout helper library if justified.
* Refactor frontend-only components for clarity and mockup adherence.

You may not casually change backend behavior.

# Frontend Library Permission

If the current frontend stack makes it difficult to accurately match the mockup, you may propose and implement frontend library changes.

Allowed examples if justified:

* `shadcn/ui`
* Radix UI primitives
* Tailwind utility restructuring
* class variance helpers
* icon library
* table helper if needed
* lightweight date/status formatting helper

Before adding any dependency:

1. Explain why the existing frontend approach is insufficient.
2. Explain what the dependency adds.
3. Confirm it does not create unnecessary complexity.
4. Keep the dependency list minimal.
5. Do not add a large component framework unless clearly necessary.

Prefer using the existing stack when practical, but do not let the old frontend structure prevent strong adherence to the mockup.

# Hard Backend Constraints

Do not change these unless absolutely necessary and explicitly justified:

* Prisma schema
* Database migrations
* Auth/session logic
* Server-side permission policies
* Board/task API contracts
* Task status transition rules
* Blocker reason validation
* Approval-required workflow rules
* Generation logic
* Recommendation logic
* Activity persistence logic

This task is a frontend structural redesign. Preserve backend behavior.

# Required First Step: Deep UI Audit

Before editing code, inspect the current frontend and the reference image.

Do not make code changes yet.

Produce a detailed UI audit with these sections:

1. Current frontend structure

   * Layout files
   * Board page files
   * Sidebar/navigation files
   * Task components
   * Activity/feed components
   * Shared UI components

2. Reference mockup structure

   * Major regions visible in `docs/images/UI_REFERENCE.png`
   * Navigation structure
   * Header structure
   * Summary card structure
   * Main board structure
   * Right rail structure
   * Task display structure
   * Visual hierarchy

3. Gap analysis

   * What is missing
   * What is structurally wrong
   * What is only superficially similar
   * What must be rebuilt
   * What can be reused

4. Frontend architecture recommendation

   * Whether the current component structure is sufficient
   * Whether new layout primitives are needed
   * Whether a UI library should be added
   * Which components should become reusable building blocks

5. Implementation plan

   * Step-by-step frontend rebuild plan
   * Files to change
   * Files to create
   * Files to remove or replace
   * Risks
   * Manual test checklist

Stop after this audit and plan. Wait for approval before coding.

# Implementation After Approval

After I approve the plan, implement the redesign as a frontend rebuild in focused steps.

Recommended sequence:

## Step 1 — Rebuild app shell

Create or revise the main authenticated app shell to match the mockup:

* Fixed/consistent left sidebar on desktop
* Collapsible/mobile-friendly navigation
* Main content area with proper max width and spacing
* Enterprise dashboard feel
* Clean background and card system

## Step 2 — Rebuild sidebar navigation

The sidebar should strongly resemble the reference structure.

Include navigation items such as:

* Dashboard / Board
* Tasks
* Vehicles
* Customers
* Appointments
* Manager Review
* Activity
* Settings, if already present

If a section is not implemented yet, show it as disabled, muted, or placeholder only if that fits the app’s existing route behavior. Do not build full Vehicles, Customers, or Appointments modules unless already supported.

## Step 3 — Rebuild board header

Create a top board header that includes:

* App/product context
* Current board date
* Daily operating status
* Clear primary action area
* Generate board / create task actions if already implemented
* Clean spacing and hierarchy like the mockup

## Step 4 — Rebuild summary cards

Add summary cards that make the board scannable:

* Total tasks
* In progress
* Blocked / waiting
* Ready for review
* Completed
* Optional appointments or attention count if supported

Use real data where available. If a metric is not supported by current data, do not fake production behavior. Either omit it or clearly use a safe placeholder.

## Step 5 — Rebuild main board area

The main board should be the center of the interface.

It should support the existing grouping/filtering controls, but visually match the reference more closely.

Task display should clearly show:

* Task title
* Assigned user
* Status
* Due time
* Workflow area
* Vehicle/customer reference if available
* Blocker/review indicator when applicable
* Quick actions where already supported

Use table, list, or grouped cards depending on what best matches the mockup and preserves usability.

## Step 6 — Rebuild right-side operational rail

Create a right rail that strongly follows the mockup concept.

The rail should include, where supported:

* Manager attention
* Ready for Review
* Blocked / waiting items
* Appointments or upcoming visibility area if already supported
* Today’s Activity Feed

The right rail should keep the team synchronized at a glance.

Do not let the activity feed disappear into a separate hidden page if the mockup shows it as part of daily visibility.

## Step 7 — Align task detail and staff task view

Update task detail and staff-focused task views only as needed so they feel consistent with the new app shell.

Preserve existing behavior:

* Status updates
* Blocker reason flow
* Approval-required flow
* Comments
* Due time display
* Assignment display

## Step 8 — Responsive behavior

Make the redesign work across screen sizes:

Desktop:

* Sidebar visible
* Board and right rail visible together
* Summary cards visible
* Main board easy to scan

Tablet:

* Sidebar may collapse
* Right rail may stack below or become a panel
* No horizontal overflow

Mobile:

* Prioritize My Tasks / daily tasks
* Use card layout if table is too dense
* Quick status updates remain accessible
* Activity and manager attention remain accessible
* No horizontal scrolling

# Visual Adherence Standard

Use `docs/images/UI_REFERENCE.png` as a structural target, not a vague inspiration.

The final UI should match the reference in:

* Page composition
* Sidebar placement
* Top hierarchy
* Card rhythm
* Board dominance
* Right rail presence
* Activity visibility
* Operational dashboard feel
* Clean enterprise spacing
* Reduced clutter

Do not simply make the current UI “nicer.” Rebuild the structure to fit the reference.

# Behavior To Preserve

Preserve all currently implemented workflows:

* Board loading
* Board grouping/filtering
* Manual task creation
* Task detail loading
* Staff status updates
* Blocked status requiring reason
* Approval-required tasks moving through Ready for Review
* Task comments
* Activity display if already implemented
* Manager-only actions
* Staff permission boundaries

If any behavior breaks because of the frontend rebuild, fix it before marking the task complete.

# Tests And Checks

Run relevant checks after implementation:

* Lint
* Typecheck
* Existing unit/integration tests
* Any frontend tests currently available
* Manual browser check at desktop width
* Manual browser check at tablet width
* Manual browser check at mobile width

If a check cannot be run, say exactly why.

# Done When

This task is done only when:

* The app visually and structurally adheres much more strongly to `docs/images/UI_REFERENCE.png`.
* The old generated UI structure has been replaced, not merely restyled.
* Sidebar, board header, summary cards, main board, and right rail all match the reference concept.
* The UI feels like a clean enterprise dealership dispatch board.
* Existing backend behavior and task workflow rules are preserved.
* Desktop, tablet, and mobile layouts are usable.
* No normal viewport has horizontal overflow.
* Important manager and staff actions remain visible and usable.
* Tests/checks are run or clearly reported.
* The final response summarizes:

  * What was rebuilt
  * What frontend architecture changed
  * Any dependencies added and why
  * What behavior was preserved
  * What checks/tests were run
  * Any remaining gaps compared with the mockup

# Do Not Implement DB-040

Do not implement `DB-040 Add board and task workflow tests` in this task.

This is the stronger frontend structural redesign that must happen before DB-040.
