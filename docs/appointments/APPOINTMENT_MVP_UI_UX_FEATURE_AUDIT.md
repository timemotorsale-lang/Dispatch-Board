# Appointment MVP UI/UX And Feature Capability Audit

**Audit date:** 2026-07-10  
**Branch reviewed:** `codex/appointment-mvp-readiness-gate`  
**Scope:** Appointment Board / Appointment Command Center MVP rollout readiness  
**Verdict:** Strong foundation, not ready for day-one rollout signoff yet.

## Executive Summary

The Appointment Board has moved well beyond a visual mockup. It now has a rich command-center shell, live read-model binding, draft creation, unscheduled draft visibility, schedule-readiness panels, resource planning, staff conflict checks, linked task visibility, lifecycle actions, outcome/follow-up controls, exception queues, notification surfaces, reporting previews, and advanced operating views.

The main MVP risk is no longer missing ambition. The risk is that the board exposes too much enterprise capability before the core day-one operator flow has been proven end to end.

For MVP rollout, the board should be treated as a manager-first scheduling console with optional advanced tools, not as a full enterprise operations cockpit by default. The recent UI refinements that restored the full board width and moved the Shift Planning Hub behind a collapsible rail action are directionally correct. The next step is to prove the smallest safe appointment workflow and reduce day-one cognitive load.

## Evidence Reviewed

- `docs/appointments/APPOINTMENT_MVP_ROLLOUT_AUDIT.md`
- `docs/appointments/APPOINTMENT_MVP_ROLLOUT_ROADMAP.md`
- `docs/appointments/APPOINTMENT_MVP_DAY_ONE_READINESS.md`
- `docs/appointments/REMAINING_WORK_DASHBOARD.md`
- `docs/RELEASE_CHECKLIST.md`
- `src/app/(app)/appointments/page.tsx`
- `src/features/appointments/appointment-board-shell.tsx`
- `src/tests/e2e/daily-workflow.spec.ts`
- Local browser layout measurement from the latest board refinement

## Current MVP Position

| Area | Current status | MVP interpretation |
| --- | --- | --- |
| Board shell and visual hierarchy | Strong but still dense | Good enough to continue toward MVP after compactness and alignment refinements |
| Collapsible planning hub | Implemented as a rail-triggered drawer | Good direction; needs accessibility and operator-mode polish |
| Live read model | Implemented | Needs rollout smoke proof and failure-state evidence |
| Appointment draft creation | Implemented | Needs browser proof from `/appointments` |
| Task-to-appointment handoff | Implemented with e2e visibility proof | Needs schedule-commit continuation proof |
| Unscheduled draft lane | Implemented | Needs clearer next-action copy and queue ownership |
| Draft scheduling | Implemented in UI/API bridge | P0 until browser-proven happy path, blocked path, and warning override path pass |
| Staff/resource/readiness safety | Implemented across many panels | Needs simplified operator guidance and acceptance proof |
| Lifecycle actions | Implemented for key commands | Needs MVP-specific coverage and unsupported-command clarity |
| Permission safety | Server-side patterns exist | P0 until manager/owner/participant/viewer/admin/system boundaries are verified |
| Advanced command-center features | Many implemented | Should be hidden behind advanced surfaces for MVP unless directly needed |
| Reporting/analytics/notifications | Rich preview/partial surfaces | Mostly defer from MVP default experience |

## UI/UX Audit

### What Is Working

- The approved mockup composition is recognizable: header, date controls, KPI strip, day schedule grid, right appointment detail rail, color-coded appointments, and upcoming appointments.
- The board now uses the available width better after the Shift Planning Hub was moved out of the default board flow.
- The left module rail is becoming useful as a mode switcher instead of dead space.
- The detail rail is powerful and gives managers one place to inspect context, linked tasks, readiness, resource planning, ownership, outcome, and action controls.
- The visual category language is strong. Color coding helps appointments read quickly.
- The unscheduled/draft lane is a good MVP pattern because it keeps demand visible without pretending unscheduled work has a time slot.

### UI/UX Gaps Blocking MVP Confidence

| Priority | Gap | Why it matters | Recommended implementation |
| --- | --- | --- | --- |
| P0 | The core draft-to-scheduled path is visually present but not yet browser-proven | MVP promise depends on safe scheduling, not just display | Add a guided smoke path that creates/selects a draft, evaluates readiness, schedules it, and verifies the grid/detail/history update |
| P0 | The right rail is too dense for day-one operators | Important actions can be buried under enterprise controls | Add a sticky "Next Safe Action" region at the top of the rail for the selected appointment |
| P0 | Blocked/warning states need plainer operator copy | Managers need to know exactly what to fix before scheduling | Replace technical readiness text with "Cannot schedule because..." and "Can schedule after..." summaries |
| P0 | Permission and disabled-action states need visible explanations | Hidden or disabled controls without explanation reduce trust | Add role-aware helper text for unavailable manager-only, owner-only, blocked, and already-complete actions |
| P1 | The Shift Planning Hub drawer needs accessibility polish | It now overlays the board, so keyboard and screen-reader behavior matter | Add `aria-expanded`, `aria-controls`, Escape-to-close, focus return, and a visible close control |
| P1 | Day-one and advanced controls are mixed together | MVP users should not need to understand command-center/reporting concepts to schedule work | Add an "MVP Mode" default and keep Intelligence/Reporting/Executive tools behind Advanced |
| P1 | The monthly calendar is useful but should not compete with the main board | Planning should assist, not obscure the operating schedule | Keep the drawer collapsible; add clear close/pin behavior rather than leaving it as a permanent column |
| P1 | The board needs viewport-specific proof | Current desktop layout looks improved, but MVP evidence needs more than one width | Test and record 1366, 1440, 1920 desktop plus tablet behavior |
| P1 | Empty/loading/error states need product copy review | MVP rollout will hit real data edge cases | Add explicit empty-board, no-drafts, no-live-data, partial-load, and retry language |
| P2 | Advanced reporting/export surfaces look impressive but can distract | Reporting is deferred from day-one MVP | Keep reporting accessible but not default-visible during MVP operations |

## Feature And Capability Audit

### MVP Capabilities That Appear Substantially Implemented

- Manager can open `/appointments` through a server-backed route.
- Appointment Board settings are read server-side with safe fallback behavior.
- Live appointment read-model binding exists.
- New appointment draft creation from the Appointment Board exists.
- Task detail can create a linked unscheduled appointment draft.
- The e2e spec proves task-created draft visibility on the Appointment Board.
- Unscheduled draft appointments render separately from scheduled calendar slots.
- The detail rail shows selected appointment information and linked task context.
- Schedule-readiness, staff-conflict, and resource-planning panels exist.
- Warning override, resource hold/release/replace, owner transfer, no-show, check-in, start, finish, outcome, and follow-up controls exist.
- Appointment history/activity evidence patterns exist.
- Admin settings, catalog, and automation consoles exist for manager workflows.

### MVP Capabilities That Need Proof Before Rollout

| Priority | Capability | Current risk | Proof needed |
| --- | --- | --- | --- |
| P0 | `/appointments` smoke route | Route exists but final MVP visual state needs formal proof | Browser smoke opens route, loads data, selects appointment, verifies detail rail |
| P0 | Draft creation from board | UI exists | Browser test creates draft with reason and sees it in unscheduled lane |
| P0 | Draft-to-scheduled commit | UI/API bridge exists | Browser test schedules eligible draft and verifies it becomes scheduled |
| P0 | Hard-block schedule prevention | Server rules exist | Test proves blocked draft cannot schedule and explains why |
| P0 | Warning override before schedule | Override workflow exists | Test proves warning requires authorized reason and then permits commit |
| P0 | Permission boundaries | Initial command/read/direct-detail/system-action safety evidence exists | Add cross-location/search evidence before final rollout |
| P1 | Lifecycle command MVP | Buttons exist | Tests for supported check-in, start, finish, no-show, outcome/follow-up flows |
| P1 | Linked task return path | Initial MVP browser proof now exists | Continue with richer linked-work actions and final scheduled-handoff coverage |
| P1 | Exception queues | Rich queues exist | Define day-one lanes and prove each queue has a next action |
| P1 | Activity/history evidence | Patterns exist | Verify key command events appear in appointment history or activity feed |

## Recommended MVP Default Experience

The default board should show only the surfaces needed for day-one scheduling:

- Header with dealership context, search, create draft, and alerts.
- Date controls and essential filters.
- KPI strip with actionable totals.
- Unscheduled/draft lane.
- Day schedule grid.
- Upcoming appointments.
- Right detail rail with selected appointment summary and next safe action.
- Linked tasks, readiness, staff/resource blockers, and outcome controls only when relevant.
- Left rail with Today, Hub, Ops, Intel, and Follow-up, but only Today and Hub should feel primary during MVP.

Advanced surfaces should remain available but not visually dominant:

- Notification Center
- Enterprise Ops
- Reporting and Exports
- Executive Review
- Ops Intelligence
- Cross-board Search
- Deep saved views and subscriptions

## Implementation Backlog Toward MVP Rollout

### P0 - Rollout Blockers

1. Add Appointment Board smoke coverage for manager route load, default layout, appointment selection, unscheduled lane, and detail rail presence.
2. Add board-created draft browser coverage from `/appointments`.
3. Add eligible draft-to-scheduled browser coverage through the command boundary.
4. Add blocked draft coverage that proves hard blocks prevent schedule commit.
5. Add warning override coverage that proves authorized reason capture is required before commit.
6. Add remaining permission boundary coverage for cross-location/search surfaces.
7. Add a right-rail "Next Safe Action" block that summarizes the one action the manager should take next.

### P1 - MVP Confidence And Operator Clarity

1. Convert the Shift Planning Hub drawer into an accessible drawer with `aria-expanded`, `aria-controls`, close button, Escape handling, and focus return.
2. Add role-aware unavailable-action copy for disabled lifecycle, schedule, resource, and ownership controls.
3. Simplify readiness copy into plain-language blocker summaries.
4. Collapse or label advanced surfaces as "Advanced" by default.
5. Create day-one exception lanes for unscheduled drafts, blocked scheduling, warning overrides needed, no-show recovery, and follow-up required.
6. Add viewport evidence for 1366, 1440, 1920, and tablet widths.
7. Record loading, empty, no-live-data, stale, and partial-failure states.

### P2 - Post-MVP Hardening

1. Broaden responsive/mobile appointment workflows.
2. Add durable reporting read models and export evidence.
3. Expand notification runtime and external integration adapters.
4. Add accessibility audit, keyboard-only walkthrough, and screen-reader spot checks.
5. Add production build, migration, load, backup, restore, rollback, and security evidence.

## Suggested Next Branch Sequence

| Order | Branch | Outcome |
| ---: | --- | --- |
| 1 | `codex/appointment-console-smoke-gate` | Prove route load, default visual layout, selection, draft lane, and right rail |
| 2 | `codex/appointment-schedule-commit-reliability` | Prove eligible schedule, hard block, and warning override paths |
| 3 | `codex/appointment-mvp-rail-and-action-clarity` | Add next safe action, accessible Hub drawer, and advanced/MVP mode separation |
| 4 | `codex/appointment-permission-safety-gate` | Prove role boundaries for appointment visibility and mutation |
| 5 | `codex/appointment-mvp-day-one-readiness` | Final evidence, known limitations, go/no-go verdict, and operator notes |

## Go / No-Go Recommendation

Do not call the Appointment Board MVP rollout-ready yet.

Do continue merging focused UI/UX and smoke-gate refinements into the MVP path when they make the board simpler, safer, or easier to prove.

The board is close enough visually to start formal MVP smoke work. The next milestone should not add broad new enterprise features. It should prove the core scheduling workflow, reduce operator noise, and record release evidence.
