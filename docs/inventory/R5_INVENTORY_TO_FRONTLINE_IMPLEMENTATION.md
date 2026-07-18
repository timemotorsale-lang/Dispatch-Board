# Inventory Console R5 Inventory-to-Frontline Implementation

**Release / milestone:** R5 / M5  
**Slices:** IC-050 through IC-059  
**Implemented:** 2026-07-18  
**Branch:** `codex/inventory-console-r5-inventory-to-frontline`  
**Repository result:** `BOUNDED INTERNAL IMPLEMENTATION COMPLETE; MIGRATION, EXTERNAL ADAPTERS, PILOT, AND PRODUCTION NOT ACTIVATED`  
**Activation:** Repository only; no migration was applied and no carrier, title-agency, listing, DMS, accounting, notification, pilot, or production action was authorized

## Outcome

R5 introduces one coordination aggregate, `INV-ITF`, for each eligible InventoryUnit. It preserves domain ownership: the workflow consumes authoritative R4 acquisition evidence, RepairOrder/RepairJob and Parts completion, title readiness, and the merchandising package instead of duplicating those records. A unit becomes `FRONTLINE_READY` only through a current, whole-package, independent release decision.

The Inventory Lifecycle landing page, global Inventory navigation, and Workflow Launcher now route staff to `/vehicles/inventory-to-frontline`. The workspace exposes a milestone strip, permission-scoped queue, purpose-built actions, honest integration status, accountable next action, and immutable command history.

## Slice evidence and bounded status

| Slice | Implemented repository evidence | Remaining activation evidence |
| --- | --- | --- |
| IC-050 | R4 acquisition validation; future target; authorized transport/no-transport path; cost and release evidence; observed delivery required | Carrier acknowledgement, transport-provider reconciliation, automated exception escalation |
| IC-051 | Identity, arrival, mileage, keys, condition, custody, documents, evidence, authoritative receipt record, and fail-closed hold | Real receiving fixtures and operational sign-off |
| IC-052 | Versioned template identity, findings/evidence, identity and safety critical blockers, correction return | Diagnostic/title routing adapters and representative tabletop fixtures |
| IC-053 | Human-approved amount, plan version/evidence, delegated amount check, and authoritative inventory-recon RepairOrder link | Full scope-change/reapproval and alternate-route tabletop evidence |
| IC-054 | Completion reads authoritative RepairJobs and Parts demands; open jobs or parts block QC handoff | R7/R8 production activation, supplier/custody integrations, real workload verification |
| IC-055 | Independent reviewer, critical QC/safety/legal/road-test hard gates, no score averaging | Qualified-reviewer policy matrix and failed-QC rework tabletop |
| IC-056 | Versioned authoritative title-readiness record, evidence, requirement policy, dependency-clear gate, independent reviewer | Title-agency acknowledgement/reconciliation and due/escalation automation |
| IC-057 | Verified facts, media, content, five-photo minimum, human-approved price, versioned package, explicit channel reconciliation | Listing-channel acknowledgement/reconciliation and publication freshness monitoring |
| IC-058 | Whole-package fail-closed evaluator, four-eyes release, atomic InventoryUnit/package release, physical/internal/digital verification, suspension, correction, and mandatory re-review | Operational reinstatement cases, notification delivery, and pilot sign-off |
| IC-059 | Deterministic domain test suite plus R3/R4/navigation regressions | Full nine-slice happy/alternate/failure/reversal tabletop, accessibility/performance evidence, pilot readiness approval |

## Workflow and authority boundaries

```text
R4 Acquisition & Appraisal
  -> one controlled InventoryUnit
  -> INV-ITF transport / receipt / inspection
  -> authoritative inventory-recon RepairOrder
  -> authoritative RepairJobs + Parts demands
  -> independent QC / safety verification
  -> authoritative title-readiness version
  -> versioned merchandising package
  -> independent whole-package release
  -> physical + internal + digital availability verification
  -> suspend -> correct -> full release review when a material fact changes
```

| Contract | Purpose |
| --- | --- |
| `/vehicles/inventory-to-frontline` | Permission-scoped R5 operating workspace |
| `GET/POST /api/frontline-workflows` | List projection, eligible options, and governed start |
| `POST /api/frontline-workflows/{id}/commands` | Stage-aware evidence-bearing commands |
| `InventoryFrontlineWorkflow` | One coordination state and current evidence snapshots per InventoryUnit |
| `InventoryFrontlineWorkflowEvent` | Immutable command transition history |

## Enforced invariants

- One `INV-ITF` workflow exists per InventoryUnit.
- R4 authoritative acquisition evidence is required to start.
- ETA alone never completes transport; observed delivery evidence is required.
- Receipt identity/custody failures and critical inspection failures hold the workflow.
- Recon must link the authoritative `INVENTORY_RECON` RepairOrder.
- RepairJobs and Parts dependencies must be authoritatively complete before QC.
- Critical quality, safety, legal, and applicable road-test checks all pass independently; scores cannot average a failure away.
- Title and merchandising records are versioned and evidence-bearing.
- Empty JSON snapshots never satisfy release gates.
- Workflow owner cannot independently verify quality/title or authorize/reinstate release.
- A changed merchandising package invalidates the release attempt.
- Suspension never deletes history or silently restores readiness; correction returns to full release review.
- Workflow command, aggregate version, audit, event, outbox, and workflow history are committed atomically.

## Data and migration

Migration `20260718160000_inventory_console_r5_inventory_to_frontline` is additive. It adds the workflow aggregate, immutable workflow events, enums, indexes, and scoped foreign keys without removing existing records. Prisma schema validation and client type generation pass. The migration has not been applied to any user, pilot, or production database.

## Verification

- Prisma schema validation: passed.
- Prisma Client generation with `--no-engine`: passed.
- R5 domain/UI and R3/R4/navigation focused regression set: 4 files, 31 tests passed.
- Full repository test run: 1,161 of 1,177 tests passed; all R5 tests passed. Sixteen unrelated appointment/inventory-foundation tests failed because appointment suites attempted an incompatible Prisma test datasource, one calendar expectation used a different effective date, one board route returned 500 in its fixture, and one legacy UI text assertion expected superseded copy. Those files were not changed for R5 and the failures are not represented as resolved.
- TypeScript typecheck: passed.
- Full repository lint: passed with zero warnings.
- Next.js production build: passed using an isolated output directory; 140 pages generated and the R5 workspace plus both R5 API routes were registered.

## Capability truth and release decision

The repository contains the internal aggregate, migration artifact, commands, projection, UI workspace, navigation, hard gates, authoritative Shop/Parts/title/merchandising handoffs, audit/event/outbox integration, suspension, and correction/re-review behavior.

External carrier, title-agency, listing, DMS, accounting, and notification adapters remain disabled and were not contacted. Scheduled escalation, full accessibility/performance evidence, provider reconciliation, representative end-to-end tabletop cases, migration deployment, pilot sign-off, support readiness, and production activation remain pending.

No commit, push, pull request, merge, deployment, external mutation, migration application, pilot, or rollout activation was performed.
