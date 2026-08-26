# UCRM-025 CRM Home "My Work" v1 Checkpoint

**Date:** 2026-08-15

**Implementation baseline:** `3bbfa641+working`

**Branch:** `main`

**Status:** `IMPLEMENTED_UNVERIFIED`; authenticated browser proof and isolated PostgreSQL reconciliation proof remain pending

## Delivered boundary

- `/crm` Home and `/crm?view=work` now use a real persisted read-only CRM work queue.
- The queue currently aggregates permitted work from existing Appointments, Leads, Customer Resolution Cases, and CRM customer next-action follow-up records.
- Task rows remain intentionally withheld from the live CRM queue until tenant-safe Task authority can be proven without inferring organization scope.
- Every queue item drills into an existing governed source route, and safe Customer 360 continuity is shown only when a valid customer route can be derived.

## Security and authority

- The queue fails closed unless shell mode, CRM customer read mode, and the dedicated CRM work mode are all `REVIEW`.
- Viewer authorization is derived from the existing CRM customer read policy, including owner-only restrictions for Sales.
- Organization scope is resolved from active location grants and rejects zero-scope or multi-organization ambiguity.
- Appointment rows are shown only when the viewer has active schedule-view access for the resolved organization.
- Lead rows are omitted when the Sales workspace is not permitted, and Customer Resolution Case rows are omitted when the Customer Resolutions workspace is not permitted.
- Lane coverage now distinguishes whether a source is unavailable because the workspace route is denied, the active organization schedule scope is unavailable, or the live read itself failed.
- Linked Customer 360 routes are omitted when the linked customer identity is absent, invalid, archived, merged, cross-organization, or outside owner scope.

## Quality and correctness improvements

- Queue ranking remains deterministic: overdue first, then today, upcoming, and waiting, with stable due-time, source-kind, freshness, and id ordering.
- CRM Home and Work explain queue freshness from the live aggregated read model instead of implying operational completion.
- Live filtering now stays honest when no items match: the UI shows filtered counts and a no-match state rather than falsely suggesting that no work exists.
- The Today rail now shows only same-day appointments instead of simply taking the first few future appointments, and same-day classification uses `America/Chicago` instead of UTC calendar boundaries.
- The overdue visual state is now aligned with the live `overdue` contract so urgent work renders consistently.
- Attention actions now disable when no matching overdue or due-today item is available.
- Queue explanation and count labels now admit when the visible list is partial because a live source reached the per-source cap, rather than implying that the visible queue is complete.
- Queue explanation now also admits when source-owned work is omitted because a required source workspace is unavailable, instead of pretending those records do not exist.
- CRM Home and Work now expose per-lane read-only coverage cards for Appointments, Leads, Cases, and Customers so the operator can see which lanes are available, capped, empty, or unavailable before trusting the visible queue.
- Customer follow-up rows now also fail closed when the direct customer id is invalid, so CRM Work never substitutes a misleading Customer 360 destination when the record identifier itself is unsafe.

## Automated evidence

- 2026-08-26 refresh: the focused CRM-2 verification batch passed for timeline, manual interaction, notes, next action, task bridge, task handoff, and My Work queue coverage.
- 2026-08-26 refresh command: `npx vitest run src/tests/unit/unified-crm-customer-timeline-repository.test.ts src/tests/unit/unified-crm-customer-interaction-service.test.ts src/tests/unit/unified-crm-customer-interaction-route.test.ts src/tests/unit/unified-crm-customer-interaction-repository.test.ts src/tests/unit/unified-crm-customer-interaction-form.test.tsx src/tests/unit/unified-crm-customer-note-service.test.ts src/tests/unit/unified-crm-customer-note-route.test.ts src/tests/unit/unified-crm-customer-note-repository.test.ts src/tests/unit/unified-crm-customer-note-form.test.tsx src/tests/unit/unified-crm-customer-next-action-access.test.ts src/tests/unit/unified-crm-customer-next-action-service.test.ts src/tests/unit/unified-crm-customer-next-action-route.test.ts src/tests/unit/unified-crm-customer-next-action-repository.test.ts src/tests/unit/unified-crm-customer-next-action-form.test.tsx src/tests/unit/unified-crm-customer-task-bridge-service.test.ts src/tests/unit/unified-crm-customer-task-bridge-route.test.ts src/tests/unit/unified-crm-customer-task-bridge-repository.test.ts src/tests/unit/unified-crm-customer-task-bridge-form.test.tsx src/tests/unit/unified-crm-task-intake-handoff.test.ts src/tests/unit/unified-crm-work-queue-service.test.ts` completed with 20 files and 112 tests passing.
- Focused verification passed on 2026-08-15 for:
  - `src/tests/unit/unified-crm-work-queue-service.test.ts`
  - `src/tests/unit/unified-crm-shell-review.test.tsx`
  - `src/tests/unit/unified-crm-page-access.test.tsx`
- The shell review suite includes focused proof that a zero-match live filter:
  - preserves honest filtered counts,
  - shows a no-match message instead of an empty-work claim,
  - and keeps the queue boundary read-only.
- Focused verification now also proves:
  - appointment visibility is suppressed when active schedule-view access is absent,
  - Today rail membership follows `America/Chicago`,
  - capped live-source reads surface an honest partial-queue explanation,
  - lead/case rows are omitted when their source workspace is unavailable while the remaining queue stays usable,
  - lane-level coverage cards describe available, capped, and unavailable source states with newest visible update timing,
  - unavailable lanes now carry a specific authority reason instead of one generic unavailable label,
  - and invalid customer ids on customer follow-up rows fail closed instead of producing a misleading Customer 360 route.

## Remaining gates

- Deeper source-native read-authorization proof for Leads and Customer Resolution Cases still needs follow-up before UCRM-025 can move beyond `IMPLEMENTED_UNVERIFIED`; this checkpoint only enforces the strongest currently available route-backed workspace boundary inside CRM Work.
- Authenticated browser proof is still required across desktop/mobile for live work, filter behavior, Today rail continuity, denied/off fallback, and keyboard interaction.
- Isolated PostgreSQL proof is still required to verify real multi-source reconciliation against migrated data.
- UCRM-025 is not yet `VERIFIED`, merged as a dedicated review packet, piloted, or production-enabled from this checkpoint.
