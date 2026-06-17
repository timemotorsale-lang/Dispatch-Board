# Task: DB-017 — Add Settings API and Manager Edit Flow

Read `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and the relevant existing files first.

## Goal

Implement DB-017: add settings read/update behavior with manager-only protection.

Managers should be able to view and safely update the app’s daily board generation settings from the app UI.

This task should build on DB-016, which should already have added the settings schema and storage for:

* `dailyGenerationTime`
* `timezone`
* `businessDays`

## Current behavior

DB-016 should provide database-backed app settings storage, but there is not yet a complete manager-facing API and edit flow for viewing and updating those settings.

Settings may exist in the database, but managers cannot yet reliably edit them through the app.

## Desired behavior

Add a settings API and manager edit flow that allows a manager to:

1. View the current generation settings.
2. Edit the daily generation time.
3. Edit the timezone.
4. Edit the business days.
5. Save changes through a protected server-side path.
6. See clear loading, success, validation, and error states.

The settings flow must be manager-only. Staff users should not be able to update settings, even if they attempt to call the API directly.

## Important dependency check

Before implementing, verify whether DB-016 is complete.

DB-016 should already include:

* An `AppSetting` or equivalent settings model
* Storage for daily generation time
* Storage for timezone
* Storage for business days
* Server-side access to settings

If DB-016 is missing or incomplete, do not quietly rebuild the entire settings schema inside this task. Stop and report what is missing, then propose the smallest prerequisite fix.

## Expected API behavior

Use the existing project patterns for API routes or server actions.

Add or complete these capabilities:

* `GET /api/settings`

  * Returns the current app settings.
  * Requires an authenticated user.
  * Staff may be allowed to read settings only if the existing policy design permits it, but manager-only read is acceptable for this MVP.
  * Do not expose sensitive data.

* `PATCH /api/settings`

  * Updates generation settings.
  * Requires manager permission.
  * Validates all input server-side.
  * Returns the updated settings.
  * Rejects invalid values with clear validation errors.
  * Rejects non-manager attempts with a consistent permission error.

## Validation rules

Validate settings server-side.

Minimum validation:

* `dailyGenerationTime` is required.
* `dailyGenerationTime` must be a valid 24-hour time value, such as `09:00`.
* `timezone` is required.
* `timezone` must be a valid IANA timezone string if the project already has a validation helper for that. If not, use a practical minimal validation and leave a clear TODO only if necessary.
* `businessDays` is required.
* `businessDays` must be a non-empty list of valid weekday values.
* Monday through Saturday should be supported for the MVP.
* Avoid accepting malformed or duplicate business days.

Do not rely on UI-only validation. The server must enforce the rules.

## Expected UI behavior

Add or complete a manager settings page or section, likely under:

* `src/app/settings`
* or the existing authenticated app shell if a settings route already exists.

The UI should let a manager:

* See the current daily generation time.
* Select or edit the timezone.
* Select business days.
* Save changes.
* See a success message after saving.
* See validation errors when input is invalid.
* See a permission or access message if a non-manager reaches the page.

Keep the UI simple and consistent with the existing app style. Do not over-polish or redesign unrelated layout.

## Permission requirements

Use existing server-side policy helpers from DB-014 if available.

Manager users can:

* View settings.
* Update settings.

Staff users cannot:

* Update generation settings.
* Bypass the UI by calling the update endpoint directly.

If policy helpers do not yet exist, do not create a large permissions refactor. Add the smallest compatible manager-only check using the existing auth/session structure, and note any follow-up work needed.

## Activity/event behavior

Do not build the full activity feed in this task unless it already exists.

If an activity/event logging helper already exists, log a simple settings-updated event.

If activity events are not implemented yet, do not add the full activity event schema. Leave this for the later activity milestone.

## Constraints

* Keep the change minimal and scoped to DB-017.
* Follow the existing architecture and file patterns.
* Do not rewrite unrelated auth, settings, dashboard, or layout code.
* Do not add new dependencies unless clearly necessary.
* Preserve existing behavior.
* Keep business rules server-side.
* Keep permission checks server-side.
* Add or update tests where appropriate.
* Do not implement DB-018 or task template work.
* Do not implement daily board generation logic in this task.
* Do not implement scheduled cron behavior in this task.

## Suggested implementation approach

1. Inspect the existing settings model/storage from DB-016.
2. Identify existing auth/session and manager policy helpers.
3. Add or complete a settings repository/service if the architecture already uses repositories/services.
4. Add settings read/update API behavior.
5. Add server-side validation.
6. Add manager-only permission enforcement.
7. Add a simple settings UI form.
8. Add tests for:

   * Manager can read settings.
   * Manager can update settings.
   * Staff cannot update settings.
   * Invalid generation time is rejected.
   * Invalid business days are rejected.
9. Run the relevant checks.

## Done when

* Managers can view current generation settings in the app.
* Managers can update daily generation time, timezone, and business days.
* Non-manager users cannot update settings through the API or server action.
* Invalid settings input is rejected server-side.
* UI shows loading, success, validation error, and permission/error states where applicable.
* Relevant tests pass.
* Typecheck and lint pass if available.
* No unrelated files were changed.
* Any docs are updated only if behavior, setup, or architecture changed.
* Summarize:

  * Files changed
  * Behavior added
  * Validation added
  * Tests run
  * Anything not verified
