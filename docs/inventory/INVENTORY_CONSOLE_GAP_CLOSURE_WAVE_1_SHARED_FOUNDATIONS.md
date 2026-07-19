# Inventory Console Gap Closure — Wave 1 Shared Foundations

**Branch:** `codex/inventory-console-gap-closure-wave-1-shared-foundations`  
**Scope:** Shared R2 foundations only  
**Repository completion change:** 44 to 46 complete slices  
**Activation:** Not authorized; migration is source-controlled but not applied

## Outcome

Wave 1 closes the repository gaps for IC-023 and IC-025 and materially advances IC-022 and IC-026. It does not absorb lifecycle projections, domain workflow automation, provider activation, or pilot evidence from later waves.

## Implemented contracts

### Durable Inventory Console views — IC-023 complete

- Console-owned `InventoryConsoleSavedView`; Task saved views remain a separate authority.
- Personal views are visible to their creator. Managers may publish team views.
- Stored filters contain only governed location and work-view values and carry a version.
- Invalid or retired persisted filters recover to All inventory and all permitted locations.
- A stored location never grants scope. Control Tower authorization runs again on every open.
- Staff may delete their own views. Managers may delete shared team views.

### Connected Home operational facts — IC-025 complete

- Shop: open and blocked RepairOrders.
- Parts: unresolved demand count and unreserved required quantity.
- Throughput: InventoryUnit transitions and RepairOrder closures in the last 24 hours.
- Integration health: provider-neutral exchange volume and explicit exception states.
- No exchange evidence is `NOT_CONFIGURED`; source failure is `UNAVAILABLE`; neither state is mislabeled healthy.

### Universal discovery — IC-022 remains partial

- Governed work items join vehicles, customers, RepairOrders/jobs, appointments, Parts, purchase orders, and documents.
- Staff work-item results are owner-scoped; managers may search team work.
- Complete return-context behavior across every destination is still pending.

### Priority work views — IC-026 remains partial

- System views now include My Work, Team, Exceptions, Blocked, and Overdue.
- Durable views can preserve those filters and permitted location scope.
- Cross-domain priority composition, escalation, and deduplication remain for a later dependency-ordered slice.

## Verification contract

- Prisma schema validation.
- TypeScript typecheck and zero-warning lint.
- Saved-view normalization, visibility, sharing, recovery, ownership, and deletion tests.
- Home live/unavailable rendering and operational-fact derivation tests.
- Discovery work-item type and audit reclassification tests.
- Full repository regression suite before handoff.

## Stop boundary

This branch does not apply the migration, seed representative operational values, contact providers, change rollout flags, commit, push, merge, deploy, or claim external/pilot readiness.
