# Appointment Console Smoke Gate

**Branch:** `codex/appointment-console-ux-smoke-gate`  
**Status:** Compact UX smoke proof implemented.  
**Scope:** Manager-facing Appointment Board route load, mockup-aligned one-page default composition, scheduled appointment selection, unscheduled draft lane visibility, and right detail rail command presence.

## Automated Evidence

The Playwright daily workflow spec now includes explicit Appointment Console smoke coverage:

- `manager can pass the Appointment Board console smoke gate`
- `manager can create a linked appointment draft from a task and see it on the Appointment Board`

Together these prove:

- A manager can open `/appointments`.
- The board renders the enterprise header/search, KPI strip, day schedule, calendar shell, upcoming appointments, and right detail rail.
- The default UX smoke viewport is `1280 x 720`, matching the day-one one-page board expectation.
- The default board, right rail, and upcoming appointments are visible without body-level horizontal or vertical scrolling.
- Day view and Staff lens load as the default operating layout.
- Board controls, metrics, and toolbar stay inside the main board area instead of overlapping the detail rail.
- Selecting a scheduled appointment updates the right detail rail and active calendar item.
- The right rail exposes linked-task context, the next safe action card, and MVP command buttons.
- A task-created unscheduled draft appears in the `Unscheduled / Drafts` lane.
- Selecting that unscheduled draft marks it active, updates the right rail, and preserves the task return path.

## MVP Interpretation

This branch does not claim the full Appointment Board is rollout-ready. It closes the compact UX smoke gate only. The remaining rollout gates still need schedule-commit reliability, hard-block proof, warning override proof, full permission boundary proof, and final day-one readiness evidence.

## Follow-Up Gates

- `codex/appointment-schedule-commit-reliability`: prove eligible draft-to-scheduled commit, hard-block prevention, and warning override behavior.
- `codex/appointment-mvp-rail-and-action-clarity`: simplify day-one operator guidance and keep advanced controls out of the default path.
- `codex/appointment-mvp-day-one-readiness`: record final build/test/browser evidence and go/no-go verdict.
