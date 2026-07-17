# Approval-to-Implementation Traceability Matrix

**Status:** Complete planning traceability; no implementation authorization

| Slice | Direct decisions | Catalog | Approval packet | Handoff | Primary tabletop | Current gate |
| --- | --- | --- | --- | --- | --- | --- |
| 1 Acquisition/Transport | `001`-`006`,`010`-`015` + applicable `020`-`075` | [`Acquisition/Transport`](../ACQUISITION_TRANSPORT_DECISION_CATALOG.md) | AE-1/AE-2 | [`Slice 1`](handoffs/SLICE_01_ACQUISITION_TRANSPORT.md) | TT-002–006,023–026 | NO-GO |
| 2 Receipt/Custody | `080`-`089` + global | [`Receipt/Custody`](../RECEIPT_CUSTODY_DECISION_CATALOG.md) | AE-3 | [`Slice 2`](handoffs/SLICE_02_RECEIPT_CUSTODY.md) | TT-003–007,023–025 | NO-GO |
| 3 Inspection/Triage | `090`-`099` + global | [`Inspection/Triage`](../INSPECTION_TRIAGE_DECISION_CATALOG.md) | AE-3 | [`Slice 3`](handoffs/SLICE_03_INSPECTION_TRIAGE.md) | TT-006–008,023–025 | NO-GO |
| 4 Recon Planning | `100`-`109` + global | [`Recon Planning`](../RECON_PLANNING_APPROVAL_DECISION_CATALOG.md) | AE-4 | [`Slice 4`](handoffs/SLICE_04_RECON_PLANNING.md) | TT-008–010,023–025 | NO-GO |
| 5 Parts/Repair | `110`-`119` + global | [`Parts/Repair`](../PARTS_REPAIR_EXECUTION_DECISION_CATALOG.md) | AE-4 | [`Slice 5`](handoffs/SLICE_05_PARTS_REPAIR.md) | TT-009,011–013,023–025 | NO-GO |
| 6 Quality/Safety | `120`-`129` + global | [`Quality/Safety`](../QUALITY_SAFETY_VERIFICATION_DECISION_CATALOG.md) | AE-4 | [`Slice 6`](handoffs/SLICE_06_QUALITY_SAFETY.md) | TT-013–015,023–025 | NO-GO |
| 7 Title/Documents | `130`-`139` + global | [`Title/Documents`](../TITLE_DOCUMENT_READINESS_DECISION_CATALOG.md) | AE-5 | [`Slice 7`](handoffs/SLICE_07_TITLE_DOCUMENTS.md) | TT-016–017,023–025 | NO-GO |
| 8 Merch/Pricing | `140`-`149` + global | [`Merch/Pricing`](../MERCHANDISING_PRICING_DECISION_CATALOG.md) | AE-6 | [`Slice 8`](handoffs/SLICE_08_MERCHANDISING_PRICING.md) | TT-018–019,023–025 | NO-GO |
| 9 Frontline Release | `150`-`159` + global/upstream | [`Frontline Release`](../FRONTLINE_RELEASE_REVIEW_DECISION_CATALOG.md) | AE-7 | [`Slice 9`](handoffs/SLICE_09_FRONTLINE_RELEASE.md) | TT-019–026 | NO-GO |

## Future implementation order

Each handoff mandates: policy → domain/state → persistence/versioning → server permissions/commands → events/audit/evidence/idempotency → integrations/reconciliation → staff/manager UX → failures/degraded states → automated scenarios → tabletop → shadow → manager-confirmed pilot → outcomes → rollback rehearsal → separate activation.

## Traceability acceptance

Every future requirement, command, UI decision, test, event, metric and rollout gate must reference its `ITF-APR-*`, catalog decision/rule/scenario, handoff requirement and policy version. Untraceable consequential behavior is rejected.
