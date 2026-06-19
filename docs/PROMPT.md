I am working on the `v0.4.0 - Board and task workflow` branch for the Time Motor Sales Dispatch Board.

Create a focused Codex implementation prompt for these roadmap items:

- `DB-031 Add manual task creation API`
- `DB-032 Add manual task creation UI`
- `DB-033 Add task detail endpoint and read model`
- `DB-034 Add staff status update endpoint`

Use these project files as context:

- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- `docs/DEFAULT_PROMPT.md` if useful
- `UI_REFERENCE.png` when the task touches board layout, task creation UI, task detail UI, staff update controls, spacing, workflow visibility, or manager/staff daily-use experience

Before writing the Codex prompt, briefly classify this combined work as one of these:

1. API/backend work
2. UI work
3. Full vertical slice
4. Validation/policy work
5. Test-only work
6. Follow-up bug fix or polish

Include a one-sentence reason for the classification.

Then make a judgment call: should these four roadmap items be implemented together as one Codex task, or split into smaller Codex prompts? Be honest. If the combined task is too large, recommend a split plan first. If it is reasonable as one vertical slice, continue with one implementation prompt.

Generate a concise Codex prompt with these sections:

# Task

Use the exact roadmap IDs and titles:

`DB-031 Add manual task creation API`  
`DB-032 Add manual task creation UI`  
`DB-033 Add task detail endpoint and read model`  
`DB-034 Add staff status update endpoint`

# Goal

State the specific outcome for this slice:

- Managers can create manual tasks from the app.
- Manual task creation validates required fields, especially title, assigned user, due time, status, workflow area, and optional vehicle/customer references.
- The app can load a single task detail read model reliably.
- Staff can update the status of their own assigned tasks through validated server logic.
- Server-side permissions and validation remain the source of truth.

# Context

Tell Codex to read the required docs before editing:

- `docs/AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/MVP_SCOPE.md`
- Relevant existing files in `src/app`, `src/features/board`, `src/features/tasks`, `src/server/repositories`, `src/server/services`, `src/server/policies`, and `src/server/validation`

Mention that this follows DB-028, DB-029, and DB-030, so Codex should preserve the existing board read API, initial board page, grouping/filtering controls, and current UI direction.

# Current behavior

Describe the expected current baseline:

- The board can show real board data.
- The board may already support grouping/filtering.
- Managers and staff can view the board.
- Manual task creation, single task detail loading, and staff status updates are not yet fully implemented.

Tell Codex to verify the actual current behavior from the codebase before editing and not assume planned features are already complete.

# Desired behavior

Include these requirements:

## Manual task creation API

- Add or complete the server/API path for creating manual tasks.
- Require a task title.
- Require due time.
- Require assigned user unless the existing domain model explicitly supports manager-review-needed unassigned tasks.
- Support workflow area.
- Support description/notes if the model has it.
- Support optional vehicle/customer text fields.
- Set source type as manager/manual or equivalent based on the existing schema.
- Apply manager-only permission for manager-created tasks unless the existing policy already supports staff-created self-tasks.
- Do not allow manual task creation to interfere with generated-task duplicate prevention.
- Create an activity event if activity event infrastructure already exists; if it does not exist yet, leave a clear TODO or use the existing project pattern without inventing a half-built activity subsystem.

## Manual task creation UI

- Add manager-facing task creation controls to the board or task surface using the existing UI structure.
- Keep the UI simple, clean, and aligned with `UI_REFERENCE.png`.
- Prefer a compact form, drawer, modal, or board-level action that does not clutter the dispatch board.
- Show validation errors clearly.
- Show success/failure feedback.
- Refresh or update the board after task creation.
- Preserve grouping/filtering behavior.

## Task detail endpoint and read model

- Add or complete a single task detail read endpoint/server action.
- Return all fields needed for task detail UI, including title, description, status, due time, assigned user, recommended user if available, workflow area, vehicle/customer references, source information, blocker reason, review fields, timestamps, and any existing comments/activity fields only if already supported.
- Enforce that authenticated users can view tasks according to the existing board visibility rules.
- Keep the read model stable and typed.

## Staff status update endpoint

- Add or complete a validated status update server path for tasks.
- Staff can update only their own assigned tasks.
- Managers can update tasks according to existing manager policy.
- Use allowed MVP statuses:
  - Not Started
  - In Progress
  - Blocked
  - Waiting on Parts
  - Waiting on Approval
  - Ready for Review
  - Completed
- Do not fully implement DB-035 or DB-036 beyond what is necessary for DB-034 unless the existing code already makes those validations easy and directly related.
- If moving to Blocked currently requires a blocker reason due to existing shared validation, preserve that behavior.
- If approval-required completion rules are not yet implemented, avoid pretending they are complete; leave a clear note that DB-036 will finish that rule.

# Visual guidance from mockup

Use `UI_REFERENCE.png` as the visual direction for task creation and task detail surfaces.

Priorities:

- Keep the Time Motor Sales Dispatch Board clean and enterprise-level.
- Preserve the board as the main operational command center.
- Do not clutter the board with too many always-visible controls.
- Make the create-task action easy for managers to find.
- Make status updates fast for staff.
- Keep the right-side activity rail or existing activity/feed placeholder visible if already present.
- Preserve responsive behavior.
- Avoid horizontal overflow.
- Use existing components and styling patterns before adding new ones.

# Constraints

- Keep the change minimal and reviewable.
- Do not rewrite unrelated board, auth, generation, settings, or layout code.
- Follow existing project architecture and naming patterns.
- Keep business rules server-side.
- UI hiding is not enough; enforce permissions in the server path.
- Do not add new dependencies unless clearly necessary.
- Do not implement future roadmap items broadly.
- Do not build a full customer database or vehicle database; use optional text references only.
- Preserve generated tasks and duplicate-prevention behavior.
- Preserve existing tests.
- Add or update tests where appropriate.

# Implementation guidance

Ask Codex to:

1. Inspect existing board/task API, repository, service, policy, and validation patterns.
2. Identify the smallest set of files needed.
3. Implement the server-side task creation and task detail read model first.
4. Add the staff status update endpoint with permission checks.
5. Add manager-facing task creation UI.
6. Wire the UI to refresh the board or update local state after task creation.
7. Keep task detail UI minimal unless a detail screen/surface already exists.
8. Add integration/unit tests for:
  - successful manager manual task creation
  - rejected task creation without due time
  - rejected task creation without required assignment/title
  - staff can update own assigned task status
  - staff cannot update another staff member’s task
  - task detail read returns the expected shape

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
- Codex summarizes:
  - files changed
  - behavior added
  - tests run
  - any known gaps deferred to DB-035, DB-036, DB-038, DB-039, or DB-040

