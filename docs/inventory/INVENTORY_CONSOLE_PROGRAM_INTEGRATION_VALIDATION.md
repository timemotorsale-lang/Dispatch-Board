# Inventory Console Program Integration Validation

**Branch:** `codex/inventory-console-program-integration-validation`  
**Scope:** Integrated R0–R12 repository baseline  
**Contract:** `inventory-console-program-validation/v1`  
**Current repository result:** `CONFORMS`  
**Current operational result:** `EVIDENCE_REQUIRED`

## 1. Purpose

This implementation validates that the thirteen roadmap releases and thirteen milestone groups form one Inventory Console rather than thirteen disconnected feature deliveries. It does not create a fourteenth roadmap release, duplicate a domain aggregate, or convert repository verification into pilot or production evidence.

The implementation has three surfaces:

- an executable repository validator invoked with `npm run validate:inventory-console`;
- a manager-visible workspace at `/administration/program-validation`;
- a read-only catalog API at `/api/admin/program-validation`.

The executable result is intentionally not written into an R12 readiness record. Operational evidence must be collected through the R12 workflow with named owners, dates, measurements, references, and independent review.

## 2. Program invariants

The validator fails closed when any of these repository contracts break:

| Check | Contract |
| --- | --- |
| PIV-001 | Exactly 13 releases, 13 milestone mappings, 121 unique slices, and an acyclic release dependency graph |
| PIV-002 | Every release retains its implementation/readiness evidence document |
| PIV-003 | All 20 required workspace routes resolve |
| PIV-004 | All 15 required API boundaries resolve |
| PIV-005 | Vehicle, InventoryUnit, RepairOrder, Part, command, event, audit, outbox, rollout, and pilot ownership remain canonical and singular |
| PIV-006 | Eleven critical foundation/release migrations exist in schema-first dependency order |
| PIV-007 | Console Home, Lifecycle, Shop, Administration, and Integrations expose their required cross-workspace handoffs |
| PIV-008 | Eight end-to-end journeys reference known releases/routes and preserve internal authority and external-system boundaries |
| PIV-009 | Operational/provider/pilot evidence is explicitly reported as `EXTERNAL_REQUIRED`, never inferred from repository success |

Any `BLOCKED` check makes the executable validator return a failing process status for local or CI use. `EXTERNAL_REQUIRED` remains visible but does not make a repository-only validation pretend it can execute a real recovery drill or pilot.

## 3. Integrated journey contracts

| Journey | Releases | Required boundary |
| --- | --- | --- |
| J-01 Acquisition to frontline | R3, R4, R5, R7, R8 | Purchase and release remain exact-version, independent decisions; external status cannot replace custody, quality, title, or release evidence |
| J-02 Acquisition to wholesale | R3, R4, R9 | Channel, reserve, sale, and settlement remain distinct; auction/listing state requires reconciliation |
| J-03 Frontline to retail completion | R3, R5, R6, R10, R11 | Sale, delivery, custody, and reconciliation bind to governed versions; DMS/payment responses remain evidence |
| J-04 Recon, Parts, quality, and release | R7, R8, R10 | Repair authorization, Parts custody, QC, and release remain separate decisions |
| J-05 Wholesale offer to settlement | R9, R10, R11 | Offer, release, financial acknowledgement, and settlement reconcile before completion |
| J-06 Cross-domain reviews and approvals | R4, R5, R6, R8, R9, R10 | Global queues compose owning-domain decisions and never become a generic mutation endpoint |
| J-07 Integration outage and replay | R1, R10, R11, R12 | Retry/replay remain authorized and idempotent; circuit-breaker, conflict, and reconciliation evidence is retained |
| J-08 Pilot pause, rollback, and decision | R1, R10, R11, R12 | Activation, pause, rollback, resume, and expansion remain distinct while read/evidence continuity is preserved |

## 4. Manager workspace

The Program Conformance workspace provides four views:

1. repository-versus-operational validation posture;
2. R0–R12 release, milestone, slice, dependency, route, and API matrix;
3. end-to-end journey handoffs with clickable destination routes;
4. operational gates that a build cannot establish.

Administration and Enterprise Readiness link to Program Conformance, and Program Conformance links back to R12 evidence collection. This creates a clear movement path without merging the two evidence classes.

## 5. Operational evidence still required

Repository conformance does not establish:

- approved pilot scope, owners, volume, duration, thresholds, or support model;
- deployed and reconciled migrations;
- real security/privacy or tenant-isolation results;
- accessibility evidence across supported devices and assistive journeys;
- production-representative performance, concurrency, lag, or job results;
- backup/restore, RPO/RTO, disaster recovery, pause, or rollback results;
- provider-specific sandbox, outage, retry, mismatch, or reconciliation results;
- limited-pilot outcomes or the eight expansion/GA sign-offs.

These items remain `EVIDENCE_REQUIRED` and must enter the applicable IC-120–IC-129 gate.

## 6. Verification

- Program validator: repository `CONFORMS`; operations `EVIDENCE_REQUIRED`.
- TypeScript typecheck: passed.
- ESLint with zero warnings: passed.
- Production build: passed, including the Program Conformance page and API route.
- Complete repository suite: 215 test files and 1,227 tests passed.
- Focused program tests verify the valid 13/13/121 baseline and fail-closed behavior for missing APIs, duplicate canonical aggregates, and missing navigation handoffs.
- Workspace test verifies truthful repository/operational separation.

The integration pass also removed two pre-existing suite failures: the InventoryUnit workspace assertion now follows the approved worklist heading, and the overlapping resource-window test now fixes its system clock instead of depending on the day the suite runs.

## 7. Stop boundary

This branch stops at integrated repository validation. It does not apply migrations, configure providers, alter rollout flags, seed pilot records, enable R12 activation, run a real recovery exercise, or record any operational gate as passed.
