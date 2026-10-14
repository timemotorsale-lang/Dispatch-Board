# IC-005 — Acceptance Fixtures and Pilot Cases

**State:** `SYNTHETIC FIXTURE DESIGN AUTHORIZED; PILOT DEFERRED`
**Data rule:** Synthetic fixtures only until approved source extracts and migration controls exist

`R0-AUTH-001` authorizes stable synthetic fixture implementation and local verification. The pilot decision record remains intentionally open and must be signed before any staff, location, real data, or production-like pilot is activated.

## Fixed fixture contract

Each case receives stable organization/location/time-zone IDs, actors/roles/capabilities, record IDs and versions, policy/catalog/projection versions, times and business calendar, amounts/currency, quantities/units, evidence checksums, source/acknowledgement states, and expected records/tasks/reviews/approvals/audit/events/outbox/projections.

Fixture values must be labeled synthetic. Expected outputs are reviewed by hand before automation. A case is not accepted because a screen resembles a mockup.

## Required enterprise case suite

| Case | Scenario | Minimum expected proof |
| --- | --- | --- |
| FX-001 | Authorized happy-path read | Scope, identity, lifecycle/Shop/Parts links, KPI envelope, drill-through reconciliation |
| FX-002 | Empty eligible population | Useful empty state, zero versus unavailable distinction, no representative records |
| FX-003 | Restricted role/location/field | Hidden/masked fields, denied command, no aggregate leakage, audit as applicable |
| FX-004 | Stale command version | Safe conflict, refresh/review path, no mutation/event duplication |
| FX-005 | Identical retry and conflicting replay | Original result returned for identical retry; request-hash conflict rejected |
| FX-006 | Missing evidence / invalid transition | Fail closed with actionable validation; no authoritative advance |
| FX-007 | Approval and four-eyes | Exact version/amount/quantity, eligible approver, self-approval blocked, material revision invalidates |
| FX-008 | Blocker, escalation, resolution, reopen | One accountable task, reason/due/owner, attributable verification and reopen history |
| FX-009 | External outage and recovery | Request/pending/ack distinct, circuit/manual path, retry/replay, no false completion |
| FX-010 | Projection lag and partial panel | Accepted command receipt, lag disclosed, no resubmit, healthy panels remain usable |
| FX-011 | Reconciliation mismatch/restatement | Owned exception, source/drill-through variance, correction evidence, explicit restatement |
| FX-012 | Cancellation/unwind/reversal | Immutable lineage, compensating records, custody/quantity/financial effects verified |
| FX-013 | Responsive/accessibility journey | Desktop/tablet/mobile, keyboard, focus, names, status, screen-reader announcements, zoom/reflow |
| FX-014 | Pause/rollback/restore | Command disabled, reads continue, evidence retained, restore/replay/reconcile, controlled resume |

## Domain pilot cases

| Case | Domain journey | Required boundary evidence |
| --- | --- | --- |
| PF-INV-01 | Vehicle/InventoryUnit conformance | Duplicate/reacquisition/open-cycle, location/custody, event history |
| PF-ACQ-01 | Opportunity to controlled acquisition | Appraisal/limit/approval/commitment; no early InventoryUnit creation |
| PF-ITF-01 | Acquisition through receipt/custody | Identity, transport acknowledgement, condition/evidence, handoff |
| PF-SHP-01 | Customer Repair | Estimate/authorization, dispatch/labor, Parts, QC/release; never enters retail lifecycle |
| PF-REC-01 | Inventory Recon | InventoryUnit link, plan/change approval, Parts, QC, frontline handoff |
| PF-PRT-01 | Parts quantity/custody | Demand/reserve/PO/receive/issue/install/return; ledger reconciliation under retry |
| PF-WHS-01 | Wholesale disposition | Candidate/appraisal/channel approval/activation/offer/release/settlement with acknowledgements |
| PF-RTL-01 | Reservation to delivery/unwind | Competing demand, title/release/readiness, custody, external mismatch and reversal |

## First M1 conformance fixture

The first code-authorized slice should use one synthetic cross-domain set containing:

- one canonical Vehicle and one open InventoryUnit;
- one Inventory Recon RepairOrder/RepairJob linked to that InventoryUnit;
- one part demand with ledger-backed quantity/custody;
- one task, blocker, review, and exact-version approval;
- one accepted command with audit/domain event/outbox evidence;
- one projection/KPI fact with freshness, quality, exclusions, and reconciling drill-through;
- one denied actor, stale version, identical retry, conflicting replay, and reversal.

This fixture verifies IC-010 through IC-017 reuse/conformance before new shared foundations are added.

## Pilot decision record

| Field | Approved value | Owner/signature |
| --- | --- | --- |
| Environment and data classification | `TBD` | `TBD` |
| Organization/location/time zone | `TBD` | `TBD` |
| Roles and named participants | `TBD` | `TBD` |
| Enabled reads/commands/integrations | `TBD` | `TBD` |
| Cohort/volume/duration | `TBD` | `TBD` |
| Training/support coverage | `TBD` | `TBD` |
| Baseline and success thresholds | `TBD` | `TBD` |
| Incident/mismatch/task-time thresholds | `TBD` | `TBD` |
| Pause/rollback authority and trigger | `TBD` | `TBD` |
| Daily reconciliation and outcome review | `TBD` | `TBD` |

## Acceptance gate

- [x] Happy, denied, conflict, retry, failure, reversal, outage, lag, reconciliation, accessibility, and rollback case families are defined.
- [x] Inventory, acquisition, frontline, Shop, Parts, Wholesale, and retail-completion journeys are represented.
- [x] Expected evidence covers authoritative records through UI, audit, event, projection, and integration state.
- [ ] Stable synthetic fixture payloads and hand-calculated expected results are approved.
- [ ] Named business/domain/security/data/integration/accessibility/reliability reviewers accept their cases.
- [ ] Test environment, pilot cohort, thresholds, support, pause, and rollback records are signed.

**Gate result:** Test design may continue. M1 completion and pilot authorization cannot be claimed until the unchecked items pass.

