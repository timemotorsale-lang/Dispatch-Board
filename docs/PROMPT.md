# Task: DB-025 Add manual generation trigger and UI feedback

Read `docs/AGENTS.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DEFAULT_PROMPT.md`, and the relevant existing generation, board, auth, policy, and UI files first.

Also inspect `UI_REFERENCE.png` before changing UI code. If the image is stored under `docs/images/UI_REFERENCE.png`, use that path. If it is elsewhere in the repo, locate it and use it as visual guidance.

## Goal

Implement DB-025: add a manager-only manual daily board generation trigger and clear UI feedback for success, failure, loading, and latest generation status.

A manager should be able to trigger generation from the app UI, see that generation is running, see the result clearly, and retry safely if generation failed.

This task should connect to the existing idempotent generation flow and `GenerationRun` recording from earlier DB-022 through DB-024 work. Do not create a separate or duplicate generation path.

## Current behavior

The prior daily generation core should already support:

- Loading generation inputs.
- Creating only missing generated tasks.
- Preserving manual tasks.
- Recording generation runs and failure outcomes.

However, the app does not yet have a manager-facing UI control for manually triggering generation and showing the result clearly.

## Desired behavior

Add a manual generation experience with these behaviors:

1. Manager-only generation action
  - Add a manager-only control to trigger daily board generation.
  - The control should generate the board for the currently selected board date, defaulting to today.
  - Staff users must not see or be able to use this control.
  - The server must enforce manager-only access even if a staff user calls the endpoint manually.
2. API / server action behavior
  - Reuse the existing daily generation service.
  - Use the same idempotent generation logic from DB-023.
  - Use the existing `GenerationRun` recording behavior from DB-024.
  - Return a useful response containing:
    - status: success or failed
    - board date
    - number of tasks created, skipped, or already existing if available
    - generation run id if available
    - summary if available
    - error message if failed
  - Do not silently swallow errors.
3. UI loading state
  - When the manager clicks the manual generation control, show that generation is in progress.
  - Disable repeated clicks while the request is pending.
  - Use clear button text such as `Generating...`.
  - Prevent double-click duplicate requests from creating duplicate tasks.
4. UI success state
  - After success, show a clear confirmation message.
  - Include a short summary such as:
    - `Board generated`
    - `X tasks created`
    - `Y duplicates skipped`
    - `Last generated at [time]`
  - Refresh or revalidate the current board view so newly generated tasks appear without requiring a full manual page refresh.
5. UI failure state
  - If generation fails, show an honest error state.
  - Include a concise failure message from the server when safe.
  - Include a retry option.
  - Do not show success if the generation run failed.
  - If there is a latest failed `GenerationRun`, surface it clearly enough for the manager to understand that the board may not be current.
6. Latest generation status
  - Show the latest generation status for the selected board date if the data already exists.
  - At minimum, display:
    - last generation status
    - triggered manually or scheduled if available
    - last generated/attempted time
    - task summary or failure message if available
  - Keep this compact. It should support the manager without cluttering the board.
7. Activity/event behavior
  - If activity event infrastructure already exists, record or display an appropriate event for manual generation.
  - If activity event infrastructure does not exist yet, do not build the full activity system in this task. Keep the implementation focused on DB-025 and rely on `GenerationRun` feedback for now.

## Visual guidance from mockups

Use `UI_REFERENCE.png` as the visual direction for this implementation.

Match the spirit of the mockup, not necessarily every pixel:

- Preserve the app name: `Time Motor Sales Dispatch Board`.
- Keep the left sidebar structure and clean enterprise dashboard feel.
- Place the primary manual generation action in the top action bar near the date selector, similar to the mockup’s blue `Generate Board` button.
- Keep `Create Task` as a separate action if it already exists or is represented in the current UI.
- Use a clean, high-contrast primary button for `Generate Board`.
- Pair the button with the selected board date so it is obvious which date will be generated.
- Use compact feedback near the button or in a nearby status card, not a large disruptive modal unless existing UI patterns already use modals.
- Preserve the KPI/card dashboard style where present.
- Keep the main board table as the center of attention.
- Preserve the right-side rail concept for attention items, appointments, or activity if those surfaces already exist.
- If the right rail exists, generation status can appear as a compact card or recent system activity item.
- Avoid clutter. The generation control should feel like a manager command button, not a full settings screen.
- Ensure the layout remains usable on desktop, tablet, and mobile.
- On mobile, the generation button can collapse into a manager actions menu if space is limited.
- Do not introduce horizontal overflow.

## Implementation guidance

Suggested approach:

1. Inspect current implementation
  - Locate the existing generation service from DB-022/DB-023.
  - Locate the `GenerationRun` model/repository/service from DB-024.
  - Locate manager policy helpers from DB-014.
  - Locate current board page/layout/components.
  - Locate current API/server-action patterns.
2. Add or complete the manual trigger route/action
  - Prefer the architecture route if it already exists: `POST /api/board/generate`.
  - If the project uses server actions instead of API routes, follow the existing pattern.
  - Validate the requested date.
  - Require an authenticated manager.
  - Call the existing generation service with `triggeredBy = manual` and the current manager user id.
  - Return structured JSON or action state for the UI.
3. Add UI control
  - Add the `Generate Board` control to the manager-facing board header/top action area.
  - Use the selected board date.
  - Show loading, success, and error states.
  - Disable the button while pending.
  - Revalidate or refresh the board data after success.
4. Add latest generation status display
  - Fetch latest `GenerationRun` for the current board date if available.
  - Display compact manager-facing status.
  - Keep it readable and unobtrusive.
5. Tests
  - Add or update tests for:
    - manager can trigger generation
    - staff cannot trigger generation
    - manual retry does not duplicate generated tasks
    - failed generation returns a visible failure state or structured error
    - UI disables repeated clicks while generation is pending if UI testing infrastructure exists
  - If full browser testing is not practical yet, add unit/integration coverage around the server action/API and document the manual UI test steps.

## Constraints

- Keep the change minimal and scoped to DB-025.
- Do not implement scheduled generation; that belongs to DB-026.
- Do not build the full activity feed if DB-041 through DB-044 are not implemented yet.
- Do not rewrite unrelated board UI, task UI, auth, schema, or generation logic.
- Do not create a second generation service.
- Do not bypass server-side permission checks.
- Do not make staff-only users able to trigger generation.
- Do not delete or overwrite manual tasks during generation.
- Do not add new dependencies unless absolutely necessary.
- Preserve existing tests and behavior.
- Follow existing project styling and component patterns.
- Keep the UI clean, responsive, and aligned with `UI_REFERENCE.png`.

## Edge cases to handle

- Manager clicks `Generate Board` repeatedly.
- Generation succeeds but creates zero new tasks because the board was already generated.
- Generation partially or fully fails and records a failed run.
- Selected date is missing or invalid.
- Staff user attempts to access the trigger directly.
- Board date already exists.
- Manual tasks already exist on the board.
- Slow request / pending state.
- Page refresh after a generation attempt.

## Done when

- A manager can trigger board generation manually from the UI.
- Staff cannot see or use the manual generation control.
- Server-side authorization rejects non-manager generation attempts.
- The UI shows loading, success, and failure feedback clearly.
- The UI shows latest generation status for the selected board date when available.
- Successful generation refreshes or revalidates the board data.
- Re-running generation for the same date does not duplicate generated tasks.
- Failed generation is visible and retryable.
- The visual placement and styling follow `UI_REFERENCE.png` closely enough to preserve the clean enterprise dispatch-board feel.
- Relevant tests pass, or any skipped tests are explained clearly.
- Lint/typecheck/test commands are run if available.
- The final response summarizes:
  - files changed
  - behavior added
  - tests/checks run
  - any remaining limitations or follow-up work

