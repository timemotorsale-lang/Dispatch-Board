# Inventory Console R3 Lifecycle and Control Tower Implementation

**Release / milestone:** R3 / M3  
**Slices:** IC-030 through IC-039  
**Implemented:** 2026-07-18  
**Branch:** `codex/inventory-console-r3-lifecycle-control-tower`  
**Repository result:** `BOUNDED IMPLEMENTATION COMPLETE — FIXED-FIXTURE EXIT PASSED; PILOT EVIDENCE NOT AUTHORIZED`  
**Activation:** Repository only; external systems, pilot, and production activation remain unauthorized

## Outcome

`/vehicles/inventory` is now the approved Inventory Lifecycle landing page and `/vehicles/control-tower` is its deeper operating workspace. Both surfaces use one server-owned InventoryUnit projection. The former InventoryUnit create/control workspace remains available at `/vehicles/inventory/units` so the new landing page does not remove governed operational capability.

The previous Control Tower mixed live inventory totals with representative Shop, Parts, capital, recommendations, capacity, and selected-vehicle facts. R3 removes those representative facts. A panel backed by the R3 InventoryUnit projection shows reconciled data; a panel without an authoritative joined projection states `Unavailable in R3` and routes staff to its owning workspace.

## Slice evidence

| Slice | Repository implementation and bounded status |
| --- | --- |
| IC-030 | Live scoped InventoryUnit totals, mutually exclusive primary-stage reconciliation, operating states, recorded cost exposure, cutoff, contract/projection versions, and data-quality envelope |
| IC-031 | Per-stage counts, overdue/blocked populations, average stage age, exposure, targets through record drill-through, and deterministic stage filters; entry/exit and median/p90 require later event-history volume |
| IC-032 | Cross-lane Shop/Recon and Parts panels are preserved but explicitly unavailable because R3 has no reconciled dependency join; customer repair work is not added to inventory counts |
| IC-033 | Deterministic priority work orders blocked, overdue, then target-due records; each item exposes accountable owner, location, state, target, blocker, exposure, next action, and selected-record drill-through |
| IC-034 | Reviews, approvals, and recommendations are explicitly unavailable rather than represented as zero or invented output; owning manager-review and wholesale workspaces remain reachable |
| IC-035 | Live acquisition-age bands and recorded, non-void USD cost exposure; the UI labels the measure as recorded exposure and does not invent forecast margin or carrying cost |
| IC-036 | Live selected InventoryUnit identity, vehicle, stage/state, lifecycle/stage age, owner, location, target, blocker, recorded exposure, next action, and worklist transition |
| IC-037 | Contract version, projection version, cutoff, freshness, quality grade, partial reasons, and reconciliation status are visible; disconnected domains remain explicit |
| IC-038 | Focused Inventory Lifecycle landing with primary Open Control Tower, secondary Wholesale, Start Workflow, KPIs, stage pipeline, priority work, decision readiness, aging, exposure, and governed worklist links |
| IC-039 | Bidirectional landing/Control Tower transition, breadcrumb, selected stage/record context, location context, constrained return path, and visible Back to Inventory Lifecycle |

## Routes and ownership

| Route | Purpose |
| --- | --- |
| `/vehicles/inventory` | Default Inventory Lifecycle landing |
| `/vehicles/control-tower` | Deeper read-oriented Lifecycle Control Tower |
| `/vehicles/inventory/units` | Governed InventoryUnit create, state-control, locations, aging, and history workspace |
| `/api/inventory-control-tower` | Permission- and location-scoped R3 projection read |

Supported Control Tower context parameters are `locationId`, `stage`, `inventoryUnitId`, and a constrained `returnTo`. The return target must remain below `/vehicles/inventory`; all other targets fall back to the Inventory Lifecycle landing.

## Projection and reconciliation rules

- One open InventoryUnit contributes to exactly one primary lifecycle stage at a cutoff.
- Stage totals must equal the scoped open-unit count.
- Void and non-USD cost entries do not contribute to USD recorded exposure; excluded currencies make the projection partial until an approved conversion source exists.
- Acquisition age and stage age use the injected projection clock, allowing deterministic tests.
- Blocked items precede overdue items; remaining items order by target.
- Unknown and unavailable dependent-domain facts are not converted to numeric zero.
- Requested location scope is reauthorized on the server.

## Verification

- TypeScript typecheck: passed.
- Repository lint: passed with zero warnings.
- Fixed-fixture R3 projection/UI tests: 5 tests passed.
- Fixture coverage reconciles scoped and stage populations, cost exposure, aging bands, blocked/overdue priority, selected record, honest unavailable states, and removal of prior representative values.
- Next.js production build: passed using an isolated output directory because the local `.next` cache was locked by OneDrive; 136 pages generated and all three R3 routes registered.
- No schema or migration change was required.

## Capability truth and remaining gates

- InventoryUnit lifecycle reads, stage filtering, priority, aging, exposure, and selected-record context: connected.
- Shop/Recon and Parts cross-lane dependency join: not connected; visibly unavailable.
- Exact-version review/approval projection: not connected; visibly unavailable.
- Governed disposition recommendation model: belongs to later Disposition & Wholesale delivery; not activated.
- Pilot fixtures, field reconciliation, external integrations, and production rollout: not authorized.
- Generic lifecycle stage advancement: not added.
- Git publication: no commit, push, pull request, or merge performed by this implementation.

## R3 repository exit

The fixed-fixture repository exit passes for the implemented InventoryUnit projection and its landing/Control Tower drill-throughs. R3 must not be represented as pilot-ready or production-complete until Shop/Parts dependencies, exact-version decisions, pilot fixtures, operational sign-off, and activation evidence exist. R4 may be implemented in repository-only mode under the existing R0 bounded authorization; no R3 production dependency is implied.
