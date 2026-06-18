# Task

DB-028 Add board read API  
DB-029 Build initial board page

# Goal

Implement the first usable board vertical slice: authenticated managers and staff can request today’s board or a date-based board from the server, and the main board page renders real generated task data instead of placeholder content.

# Current Context

Read these files first:

- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/MVP_SCOPE.md`
- `docs/DEFAULT_PROMPT.md` if useful
- `UI_REFERENCE.png` for board layout and visual guidance

This task starts v0.4.0 Board and task workflow. It assumes prior v0.3.0 work exists or is being merged into this branch: `BoardDay`, `Task`, users/roles, generation runs, and generated tasks should already exist or have planned equivalents in the codebase.

DB-028 scope: add board read API for today and date-based board retrieval.

DB-029 scope: build the initial board page using real board data.

Do not implement DB-030 grouping/filtering controls, DB-031 manual task creation, DB-033 task detail, DB-034 staff status updates, or activity feed behavior beyond a static/non-functional placeholder if the existing layout needs space for it.

# Desired Behavior

After this task:

- An authenticated manager or staff user can request today’s board.
- An authenticated manager or staff user can request a specific board date.
- The board API returns one normalized read model containing:
  - board date
  - generation status / generated timestamp if available
  - tasks for that board
  - task title, description/notes, status, due time, workflow area, source type
  - assigned user summary
  - recommended user summary if available
  - vehicle/customer text references if available
  - manager approval flag if available
  - blocker/review/completion fields if already in the schema
- The board page loads real data from the board read path.
- If today’s board exists, users see generated tasks.
- If no board exists for the selected date, users see a clear empty state.
- If the request fails, users see a clear error state.
- Loading state is visible and not jarring.
- Staff and managers can both view the full board, but no mutation behavior is added in this task.
- Existing auth/route protection patterns are respected.

# Implementation Guidance

Start by inspecting the existing repository structure and current patterns. Do not assume exact file names.

Likely areas to inspect or create:

- `src/app/board/`
- `src/app/api/board/`
- `src/features/board/`
- `src/server/repositories/`
- `src/server/services/`
- `src/server/policies/`
- `src/server/validation/`
- `src/tests/`

Recommended implementation shape:

1. Add a board read repository function that queries `BoardDay` by date and includes related tasks and user summaries.
2. Add a board read service that:
  - verifies the current user can view the board
  - normalizes the response shape for UI use
  - handles missing board dates gracefully
  - keeps Prisma/database details out of UI components
3. Add API route(s) or server action(s) following the existing app pattern:
  - `GET /api/board/today`
  - `GET /api/board/[date]` or equivalent date-based route if the existing routing pattern differs
4. Validate date input server-side.
5. Return consistent errors for unauthenticated, invalid date, not found/empty, and unexpected failure cases.
6. Build or update the board page to fetch real board data.
7. Create simple board presentation components if useful, but avoid over-componentizing.
8. Use a single initial display mode, preferably grouped or sectioned in the simplest existing-friendly way. Do not add user-switchable grouping/filtering controls because that belongs to DB-030.
9. Keep activity feed as a visual placeholder only if needed for layout continuity. Do not implement activity API or live feed behavior in this task.

Suggested board read model shape:

```ts
type BoardReadModel = {
  id: string
  date: string
  generationStatus?: string
  generatedAt?: string | null
  taskCount: number
  statusCounts: Record<string, number>
  tasks: Array<{
    id: string
    title: string
    description?: string | null
    status: string
    dueAt: string
    workflowArea?: string | null
    sourceType?: string | null
    requiresManagerApproval?: boolean
    assignedUser?: {
      id: string
      name: string
      email?: string
    } | null
    recommendedUser?: {
      id: string
      name: string
    } | null
    vehicleReference?: string | null
    customerReference?: string | null
    blockerReason?: string | null
    readyForReviewAt?: string | null
    completedAt?: string | null
  }>
}

```

Adjust field names to match the actual schema. Do not force this exact type if the implemented schema uses different names.

# UI/UX Guidance

Use `UI_REFERENCE.png` as a guide for clean, enterprise-level board layout.

Prioritize function over polish:

- Real data must load correctly.
- Permission and auth behavior must be correct.
- Loading, empty, and error states must be usable.
- Due times, statuses, assigned users, and workflow areas should be easy to scan.
- Keep the board clean and uncluttered.
- Use compact task cards or rows that show the essentials first:
  - title
  - assigned user
  - status
  - due time
  - workflow area
  - vehicle/customer reference when present
- Make blocked, waiting, and ready-for-review statuses visually noticeable without overdesigning.
- Preserve space for the right-side “Today’s Activity Feed” rail if the current UI shell already includes it or if the reference layout expects it, but keep it static/non-functional unless activity API already exists.
- Desktop should make the full team board easy to scan.
- Mobile/tablet should remain readable and avoid horizontal overflow.
- Do not chase pixel-perfect polish in this task. Functional workflow first, visual refinement second.

# Constraints

- Keep this scoped to DB-028 and DB-029 only.
- Do not combine unrelated DB tasks.
- Do not implement DB-030 grouping/filtering controls.
- Do not implement manual task creation.
- Do not implement task detail view.
- Do not implement staff status updates.
- Do not implement comments.
- Do not implement activity feed API unless it already exists and can be safely read without expanding scope.
- Preserve the existing architecture.
- Avoid broad rewrites.
- Avoid new dependencies unless clearly justified.
- Keep business rules, validation, and permissions server-side.
- UI controls may hide unavailable actions, but the server must enforce rules.
- Staff may view the full team board, but no staff mutation behavior is added here.
- Respect the branch direction: functional workflow first, visual refinement second.
- Do not overbuild future features or third-party integrations.
- Do not present planned behavior as implemented behavior.
- Use existing auth/session/policy helpers instead of inventing parallel permission logic.
- Use existing styling system and component patterns.
- If the existing schema or API shape differs from the docs, follow the implemented code and note the difference in the final summary.

# Acceptance Criteria

DB-028 acceptance:

- The app can request board data for today.
- The app can request board data for a specific date.
- The board read API is authenticated.
- The server returns only validated, normalized board data needed by the UI.
- Invalid date input returns a clear validation error.
- Missing board data returns a clear empty/not-found response pattern without crashing.
- Board read logic lives in server/repository/service layers, not inside UI components.

DB-029 acceptance:

- A manager or staff user can open the board page and see generated tasks from real board data.
- The board page shows task title, assigned user, status, due time, and workflow area at minimum.
- The board page handles loading, empty, and error states.
- The page remains readable on desktop and usable on smaller screens.
- The page does not use hardcoded placeholder tasks as production-facing data.
- Any visual placeholder, such as activity rail space, is clearly non-functional and does not pretend to be live.

Combined acceptance:

- DB-028 and DB-029 work together as one reviewable vertical slice.
- Existing generation/manual generation behavior is not broken.
- No unrelated roadmap items are implemented.
- Relevant tests or checks pass, or any skipped checks are explained clearly.

# Tests / Checks To Run

Run the project’s available commands. Use the actual package scripts if names differ.

Expected checks:

- `npm run lint`
- `npm run typecheck`
- `npm test` or the project’s unit/integration test command
- Any existing API/integration test command covering authenticated routes
- Manual browser check:
  - log in as manager
  - open today’s board
  - verify generated tasks display
  - request/select a date with no board and confirm empty state
  - verify unauthenticated access redirects or returns unauthorized according to existing pattern
  - verify the layout does not overflow on desktop and a smaller viewport

Suggested tests to add or update:

- Board read service returns today’s board with tasks.
- Date-based board read returns the requested date.
- Invalid date is rejected.
- Unauthenticated board API access is rejected.
- Board page renders task data from the board read model, if UI testing infrastructure exists.

If UI tests are not practical yet, add service/API tests and document manual UI verification.

# Codex Summary Required After Implementation

After implementation, summarize:

- Files changed
- Behavior added or fixed
- API routes/server actions added
- Board read model shape
- Server-side validation/policy impact
- UI impact
- Loading, empty, and error states added
- Tests/checks run
- Any skipped checks and why
- Any follow-up work, limited to DB-028/DB-029 direct scope

