# Appointment Console Refinement Source of Truth

Approved branch: `codex/refine-appointment-console`

## Adopted UI sources

The Appointment Console refinement is governed by these approved mockups:

- `docs/appointments/assets/appointment-console-today-flow-approved.png`
- `docs/appointments/assets/appointment-console-new-appointment-approved.png`

## Product decision

The Appointment Console should open as a calm daily action workspace, not as the full enterprise board.

Default landing:

- Today Flow
- Capacity Confidence
- Confirmation Queue
- Follow-up Scheduling
- Exceptions / Manager Review

`+ New Appointment` opens a calendar-first scheduling workspace:

- Appointment Console dark app-sidebar
- small month navigator
- Day / Week / Month scheduling surface
- appointment setup controls in the booking rail
- live appointment summary
- quiet advanced links for capacity, conflicts, resources, and manager review

The deeper enterprise board remains available through `Schedule Board` and advanced capability links.

## Sidebar contract

Appointment Console pages own the left app-shell sidebar. When a user enters Appointment Console from Dispatch, the Dispatch left navigation is replaced by the Appointment Console dark sidebar:

- Today Flow
- Calendar
- Planning Hub
- Operations
- Follow-up
- Intelligence
- Exceptions
- Advanced
  - Reports
  - Automation
  - Templates & Rules

This sidebar must not become the general Operations Coordinator workspace sidebar, and it must not be duplicated inside the page body.
