# Appointment MVP Rollout Audit

**Branch:** `codex/appointment-mvp-readiness-gate`  
**Milestone:** 1 - MVP scope audit and readiness boundary  
**Status:** Implemented as a planning gate  

## Product Boundary

The Appointment Command Center is not a separate product and not a standalone calendar. It is the scheduling and coordination layer inside Dispatch Board. It connects time, owners, staff, customers, vehicles, resources, source tasks, follow-up work, activity history, exceptions, and audit evidence.

The enterprise appointment roadmap remains the long-term direction. The MVP rollout is narrower: day one must prove that a manager can safely run appointment scheduling work from the console without losing context, bypassing policy, or creating untraceable operational decisions.

## Day-One MVP Promise

The day-one Appointment MVP should promise only the following:

- A manager can open `/appointments` and understand the day from a single command-center surface.
- The console clearly separates scheduled appointments, unscheduled draft requests, exceptions, and selected-detail actions.
- A manager can create a draft appointment from the Appointment Console with a documented reason.
- A manager or eligible task owner can create a linked unscheduled draft appointment from a task.
- The appointment detail rail shows the selected appointment, linked task context, customer or vehicle context when available, readiness state, and next available command.
- A draft can be scheduled only when server-side readiness, staff, resource, lifecycle, and permission rules allow it.
- Hard blocks cannot be overridden through the UI.
- Warning-level scheduling requires an explicit authorized override reason before commit.
- Appointment actions leave enough history for day-one audit: who acted, what changed, why it changed, and which related task or appointment was affected.
- Participants and viewers can inspect appropriate appointment context without gaining manager-only mutation rights.

## MVP In Scope

- Appointment Command Center route and compact operating shell.
- Live appointment read-model binding with safe fallback or empty states.
- Unscheduled / draft lane for appointment requests that are not yet committed to a time.
- New appointment draft creation from the Appointment Console.
- Task-to-appointment linked draft creation from task detail.
- Detail-rail command hierarchy for the selected appointment.
- Schedule readiness preview for proposed scheduling windows.
- Staff conflict and participant conflict preview.
- Resource planning preview, candidate selection, hold, release, replacement, and schedule commit where already implemented.
- Warning override capture where policy allows it.
- Reason-required appointment commands.
- Appointment history, command ledger, linked task visibility, and activity evidence sufficient for MVP rollout.
- MVP smoke coverage that proves the happy path and the most important blocked path.

## Deferred From MVP

- Full enterprise E1 through E10 completion.
- External SMS, email, external calendar, CRM, DMS, or third-party scheduling integrations.
- Full analytics, forecasting, capacity reporting, and executive reporting.
- Full automation-rule builder and advanced template administration.
- Multi-location expansion beyond the configured day-one operating baseline.
- Advanced drag-and-drop calendar editing unless it is already safe and fully policy-bound.
- Native mobile application workflows.
- Broad self-service customer scheduling.
- Deep notification runtime beyond internal command and audit evidence.
- Full recurrence, bulk operations, waitlist, and enterprise hardening beyond the MVP acceptance paths.

## Current Readiness Verdict

The Appointment Console is feature-rich, but it should not be treated as 100% MVP-ready until the scheduling commit path and readiness gates are proven end-to-end in the browser.

Approximate readiness level from the current documentation and implementation state:

| Area | MVP Readiness | Rollout Note |
| --- | ---: | --- |
| Command-center shell | 80% | Strong surface exists, but needs compact MVP smoke proof. |
| Live read model | 85% | Read API and board binding are documented and implemented. |
| Task-to-appointment handoff | 80% | Linked draft workflow exists; final schedule commit should be tested as a separate gate. |
| Scheduling readiness | 70% | Rich contracts exist, but MVP needs a reliable browser-proven draft-to-scheduled path. |
| Resource and staff safety | 75% | Warning/block policy exists; operator clarity and smoke coverage remain critical. |
| Permission safety | 75% | Permission matrix exists; MVP-specific acceptance tests should prove manager/owner/participant/viewer behavior. |
| Audit/history | 80% | Command ledger pattern is strong; day-one evidence template should be filled during the final gate. |
| Overall Appointment MVP | 72% | Good foundation; not yet day-one releasable without the remaining rollout gates. |

## P0 Gaps Blocking Day-One Signoff

- The browser-proven draft-to-scheduled path must be reliable and obvious, including why scheduling is disabled when readiness dependencies are unmet.
- MVP smoke coverage must prove `/appointments` opens, loads live/fallback data safely, displays the unscheduled lane, selects a record, and exposes the expected detail-rail actions.
- The operator needs a clear distinction between draft, proposed, held, scheduled, blocked, and warning states.
- Hard-block and warning-override behavior must be tested against the server command boundary, not only visually inspected.
- Manager, owner, participant, viewer, administrator, and system-action permissions need a focused MVP acceptance pass.

## P1 Gaps To Close Before Confident Rollout

- Exception queues should be simplified into day-one operating lanes with a clear next action.
- The right rail is powerful but crowded; MVP should prioritize the next safe command over every enterprise control.
- Availability recommendations, resource candidates, and staff readiness need plain-language next-action copy.
- Admin and configuration surfaces should be locked to the minimum production-safe baseline for MVP.
- Linked task history should make it easy to return from an appointment back to the source task and follow-up work.

## P2 Deferred Hardening

- Enterprise analytics and reporting dashboards.
- Notification runtime and external integrations.
- Advanced recurrence, bulk reschedule, and waitlist operations.
- Expanded responsive/mobile operator workflows.
- Accessibility, performance, backup, restore, audit export, and operational monitoring beyond the day-one acceptance package.

## First Milestone Outcome

This audit narrows the Appointment roadmap from enterprise ambition into a day-one MVP gate. The next implementation slice should prove the console visually and functionally in the browser before adding more appointment capability.
