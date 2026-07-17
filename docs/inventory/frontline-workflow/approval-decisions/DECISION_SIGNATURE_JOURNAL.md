# Inventory-to-Frontline Decision Signature Journal

**Status:** Slice 1 partial execution recorded; 22 decisions closed; 28 Slice 1 decisions remain open
**Source recommendations:** [`Consolidated Ledger`](../approval-execution/CONSOLIDATED_130_DECISION_LEDGER.md)

## Valid decision record

Create one journal entry per authorized decision. Never overwrite or delete a prior entry; corrections supersede it by reference.

```text
approvalRecordId:
decisionId:
sessionId:
disposition: APPROVE | APPROVE_WITH_CHANGE | DEFER_SAFE | REJECT
exactAuthorizedPolicy:
safeDefault:
approverName:
approverRole:
authoritySourceAndScope:
additionalRequiredSigners:
conflictOrRecusal:
organizationLocationAndCohort:
workflowAndPolicyVersion:
effectiveAt:
conditionsAndExclusions:
dependenciesAndAffectedSlices:
ownerAndTargetForDeferral:
reviewOrExpiryAt:
closureEvidenceReferences:
rationale:
recordedByAndRecordedAt:
supersedesApprovalRecordId:
```

## Journal

| Record ID | Decision | Disposition | Exact policy reference | Approver/authority | Effective scope/version | Conditions/expiry | Evidence/effective date | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ITF-AE1-APR-001` | `ITF-APR-001` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/Operations authority | Time Motor Sales Minneapolis; `ITF-1.0` | Program outcome/precedence only | AE-0 confirmation + user instruction to execute Slice 1 approvals; effective 2026-07-16, exact time not captured | VALID |
| `ITF-AE1-APR-002` | `ITF-APR-002` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/Operations authority | Same | First build ends at accepted Receipt/Custody handoff | Same | VALID |
| `ITF-AE1-APR-003` | `ITF-APR-003` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/Operations authority | Same | Shadow/manual starts only; automatic start disabled | Same | VALID |
| `ITF-AE1-APR-004` | `ITF-APR-004` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/Operations authority | Same | Catalog terms for tabletop only; changes versioned | Same | VALID |
| `ITF-AE1-APR-005` | `ITF-APR-005` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/Operations authority | Same | Critical gates non-waivable | Same | VALID |
| `ITF-AE1-APR-006` | `ITF-APR-006` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/Operations authority | Same | Separate cancellation/reversal/recovery commands | Same | VALID |
| `ITF-AE1-APR-010` | `ITF-APR-010` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/Operations authority | Time Motor Sales; Minneapolis; `ITF-1.0` | Initial location scope only | Same | VALID |
| `ITF-AE1-APR-011` | `ITF-APR-011` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate reviewer; Brock Harris operating owner | Same | Approved narrow source cohort; excluded sources manual | Same | VALID |
| `ITF-AE1-APR-012` | `ITF-APR-012` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate safety/operations authority | Same | Standard passenger/light-duty; exclusions stay out | Same | VALID |
| `ITF-AE1-APR-014` | `ITF-APR-014` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate safety/insurance authority | Same | Onsite/no movement, approved carrier/tow, seller delivery; internal driving deferred | Same | VALID |
| `ITF-AE1-APR-034` | `ITF-APR-034` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate financial authority | Same | Aggregate correlated exposure; prohibit splitting | Same | VALID |
| `ITF-AE1-APR-051` | `ITF-APR-051` | DEFER_SAFE | Internal driving disabled until qualified roadworthiness/legal-operation policy closes the decision | Eli Aswan — ultimate safety/insurance authority | Same | Carrier/tow/onsite/seller-delivery only; review before enabling internal drive | Same | VALID |
| `ITF-AE1-APR-052` | `ITF-APR-052` | DEFER_SAFE | Internal driving disabled until driver/insurance scope, validity, privacy and revocation are approved | Eli Aswan — ultimate safety/insurance authority | Same | No internal driver; review before enabling | Same | VALID |
| `ITF-AE1-APR-056` | `ITF-APR-056` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate evidence/privacy/security authority | Same | Originals preserved; suspect evidence quarantined; dependencies re-evaluated | Same | VALID |
| `ITF-AE1-APR-061` | `ITF-APR-061` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate data authority; Brock Harris operating owner | Same | One canonical Vehicle/inventory cycle; conflicts hold | Same | VALID |
| `ITF-AE1-APR-063` | `ITF-APR-063` | DEFER_SAFE | Provider integration remains advisory/manual until state mappings, idempotency and failure controls are approved | Eli Aswan — ultimate data/integration authority | Same | Manual monitored provider path with later reconciliation | Same | VALID |
| `ITF-AE1-APR-064` | `ITF-APR-064` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate operations/financial/data authority | Same | No implied DMS/accounting/website posting, payment, publication or readiness | Same | VALID |
| `ITF-AE1-APR-070` | `ITF-APR-070` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate pilot authority | Same | Named participants and minimum representative tabletop suite required | Same | VALID |
| `ITF-AE1-APR-071` | `ITF-APR-071` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate pilot/policy authority | Same | Shadow thresholds remain hypotheses; automation disabled | Same | VALID |
| `ITF-AE1-APR-072` | `ITF-APR-072` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate pilot authority | Same | One location, trained cohort, manager-confirmed, 20 vehicles/30 days minimum | Same | VALID |
| `ITF-AE1-APR-073` | `ITF-APR-073` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/pilot authority | Same | Zero critical failures plus approved success thresholds before expansion | Same | VALID |
| `ITF-AE1-APR-075` | `ITF-APR-075` | APPROVE | Ledger row adopted without change | Eli Aswan — ultimate GM/Inventory authority | Same | Automatic start requires later separate authorization | Same | VALID |

## Control totals

| Measure | Count |
| --- | ---: |
| Expected enterprise decisions | 130 |
| Valid journal records | 22 |
| Approved | 19 |
| Approved with change | 0 |
| Safely deferred | 3 |
| Rejected | 0 |
| Still open | 108 |

These totals change only after valid signed records are entered and independently checked against the applicable decision gate.
