# Inventory Console R2 Shell and Home Conformance Assessment

**Release / milestone:** R2 / M2  
**Slices assessed:** IC-020 through IC-028  
**Assessment date:** 2026-07-18  
**Branch:** `codex/inventory-console-r2-shell-home`  
**Mode:** Read-only conformance assessment and safe local verification  
**Result:** `READY FOR R2 IMPLEMENTATION — R1 REPOSITORY EXIT PASSED`

## Executive result

The repository has useful R2 building blocks: an Inventory Console navigation definition with exactly seven destinations, canonical Vehicle Discovery search, Vehicle 360 links, task saved views, manager review, activity/event feeds, Control Tower projections, KPI services, and explicit projection loading/stale/error behavior.

The approved Inventory Console Home is not implemented. `/vehicles` still renders the older detailed Inventory Lifecycle Control Tower, including a large horizontal module-tab wall, representative values, local-only interactions, and UI-derived metrics. The Workflow Launcher is documentation-only, saved views are task-specific rather than a shared Console contract, and Reviews/Approvals/Event Log are not yet composed into the approved Home experience.

[`R0-AUTH-001`](../r0-readiness/R0_CODE_AUTHORIZATION_RESOLUTION.md) authorizes bounded repository implementation, and the [R1 implementation](../R1_FOUNDATION_IMPLEMENTATION.md) now passes its synthetic repository exit. R2 may begin after the R1 branch is reviewed and merged.

This branch therefore contains no application-code changes.

## Binding acceptance

- [M2 milestone acceptance](../INVENTORY_CONSOLE_IMPLEMENTATION_MILESTONES.md#4-m2--shared-console-shell-and-home)
- [Approved landing-page UI source of truth](../INVENTORY_CONSOLE_LANDING_PAGES_UI_SOURCE_OF_TRUTH.md)
- [Workflow Launcher UX contract](../INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md)
- [Inventory Console execution protocol](../INVENTORY_CONSOLE_IMPLEMENTATION_EXECUTION_PROTOCOL.md)

Approved mockup values are illustrative and cannot be exposed as authoritative application facts.

## Slice assessment

| Slice | Assessment | Reusable evidence | Missing proof or implementation before acceptance |
| --- | --- | --- | --- |
| IC-020 | `PARTIAL` | `console-navigation.ts` defines exactly Home, Inventory Lifecycle, Shop & Recon, Reviews, Approvals, Reports, and Administration | `/vehicles` is still the detailed Control Tower; remove the module-tab-wall regression from Home, implement approved desktop/tablet/mobile shell, selected states, global controls, and navigation tests |
| IC-021 | `PARTIAL` | Existing organization/location access policies and location-bearing command records | Shared permitted single/multi-location scope contract, time zone, capability/field restrictions, rollout intersection, unauthorized-scope behavior, and real scope control instead of a static button |
| IC-022 | `PARTIAL / STRONG` | Vehicle Discovery service/API, authorized Vehicle 360 links, VIN/stock/document search foundations | Integrate universal search into the Console shell; add task/review/approval/exception/RepairOrder/part/PO results, stable context return, field restriction, pagination, and contract tests |
| IC-023 | `PARTIAL` | Durable task saved-view service/API and basic local Control Tower filter state | Console-wide URL filter contract, permission intersection, shared/versioned views, scope/default handling, invalid/retired-filter recovery, and Inventory/Shop/Parts/Wholesale dimensions |
| IC-024 | `NOT IMPLEMENTED` | Approved launcher catalog, forms, permissions, validations, records/tasks/events contract exists in documentation | No launcher component, catalog/read contract, phase-one purpose-built forms, preview/confirmation, command receipts, conflict recovery, or role/location rollout implementation was found |
| IC-025 | `PARTIAL / MATERIAL HONESTY GAP` | Inventory Control Tower projection API/service and KPI calculation tests | Dedicated Home projection; authoritative active inventory/capital/attention/shop/parts/throughput/health facts; metric envelope and reconciliation; remove static KPI/health/aging values and UI-derived exposure assumptions |
| IC-026 | `PARTIAL` | Task system, manager-review queues, Control Tower exceptions and ownership fields | One permission-scoped Home Priority Work projection with My Work/Team/Exceptions, hard tiers, deduplication, due/escalation, next valid action, owner, and contextual routing |
| IC-027 | `PARTIAL` | Manager Review service/screen and board review queue | Distinct contextual review versus exact-version approval panels, permission counts, direct authorized actions, four-eyes/material-change behavior, and global queue return context |
| IC-028 | `PARTIAL` | Activity feed services/routes/UI, enterprise audit records, Control Tower loading/live/stale/error and retry states | Inventory Event Log composition, permission-safe audit/integration history, and consistent empty/partial/insufficient/unavailable/denied/conflict/lag/reconciliation/recovery states per Home panel |

No slice is marked complete. Passing current tests proves existing behavior only; it does not prove the approved R2 experience or all milestone gates.

## Confirmed source-of-truth mismatch

Current `/vehicles` behavior conflicts with the approved landing-page direction in these material ways:

- Home opens the detailed `Inventory Lifecycle Control Tower` instead of the approved Console Home.
- The detailed surface renders a wide module navigation with Control Tower, Vehicles, Acquisition, Recon, Shop Work, Parts, Purchase Orders, Locations, Aging, Exceptions, and many additional links.
- KPI, flow-health, stage, exception, capacity, aging, recommendation, selected-asset, financial, coaching, linked-work, and audit values include representative constants.
- Some buttons only change local notices rather than execute or navigate to purpose-built governed behavior.
- `Inventory Capital` and `Aged Exposure` include client-side display derivation rather than a governed metric-fact contract.
- The approved `+ Start Workflow`, Home routing panels, Priority Work views, contextual Reviews/Approvals, throughput, and Data & Integration Health composition are absent.

These gaps must be fixed through authorized R2 slices, not by relabeling the current Control Tower as Home.

## Existing capabilities to reuse

- `src/components/layout/console-navigation.ts` for the seven-destination console navigation definition.
- `src/server/vehicle-discovery/` and `/api/vehicle-discovery/search` for authorized vehicle search foundations.
- task saved-view services and APIs as a pattern, extended into a shared Console contract rather than duplicated.
- `src/server/inventory-control-tower/` for lifecycle projection inputs that are appropriate to Home summaries.
- manager-review and review-queue services for shared work-governance reads after R1 conformance.
- activity-feed and enterprise audit/event foundations for the Event Log.
- the existing detailed `InventoryControlTower` only as the deeper Control Tower workspace after its representative values and command boundaries are made honest.

## Verification performed

### Passed

- 14 targeted test files passed.
- 59 targeted tests passed.
- Coverage included Control Tower UI/projection behavior, KPI calculations, Vehicle Discovery, task saved views, manager review, review queue, activity feed, and task activity events.

### Not performed or not sufficient

- No application code or UI was changed.
- No browser, responsive, accessibility, visual-regression, or performance verification was run.
- No shared Home projection or fixed Home reconciliation fixture exists to verify.
- No Workflow Launcher implementation exists to test.
- No deployment, migration, external call, rollout, pilot, or production action occurred.

## Required dependency resolution

Before R2 code mutation:

1. merge the verified R1 implementation into the R2 baseline;
2. execute R2 with rollout disabled and no external or production activation under `R0-AUTH-001`;
3. implement fixed synthetic Home, scope, search, saved-view, launcher, review/approval, and failure-state fixtures;
4. obtain separate authority before commit, push, PR, or merge if those actions are desired.

## Recommended executable order after authorization

1. IC-020 shared shell and seven-destination routing, with `/vehicles` becoming Home and the existing detailed surface moving to the approved Control Tower destination.
2. IC-021 permitted location/scope contract.
3. IC-022 universal authorized search and context links.
4. IC-023 shared URL filters and saved views.
5. IC-024 Workflow Launcher and phase-one forms.
6. IC-025 Home projections/KPIs with fixed reconciliation fixtures.
7. IC-026 Priority Work.
8. IC-027 contextual Reviews & Approvals.
9. IC-028 Event Log and complete honest-state behavior.
10. Run responsive, accessibility, security, performance, and end-to-end routing acceptance before the M2 exit decision.

## Stop boundary

This assessment stops before application code, schema, migration, dependencies, configuration, routes, components, fixtures, deployment, external systems, or rollout mutation. It does not authorize or begin R3.

