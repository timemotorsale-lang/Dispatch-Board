# IC-002 — Workflow and Action Traceability

**State:** `CONDITIONALLY READY`; domain/security/integration approval pending

## Traceability contract

Every rendered value or action must resolve through a stable contract to an authoritative record or projection. UI visibility is advisory; the server re-evaluates permission, current state, evidence, expected version, separation of duties, and rollout before accepting a command.

Common command output includes command ID, resulting record/version, created or changed tasks/reviews/approvals, audit and domain-event IDs, outbox/integration state, projection-lag expectation, and unresolved exceptions. Identical retries return the original result; conflicting reuse is rejected.

## Shared value mapping

| Trace ID | Visible value | Authoritative record/projection | Drill-through / quality requirement |
| --- | --- | --- | --- |
| UX-V01 | Identity, VIN, stock/inventory number | Vehicle Registry + InventoryUnit projection | Field-masked; duplicate/conflict state visible |
| UX-V02 | Location, custody, owner | Domain event history + scoped projection | Current version/time; unowned or conflict explicit |
| UX-V03 | Lifecycle stage/count/age | InventoryUnit lifecycle events + CT-01/02 | Cutoff, target version, exclusions, reconciliation |
| UX-V04 | Shop state/load/readiness | RepairOrder/RepairJob projections | Customer Repair and Inventory Recon separated |
| UX-V05 | Parts demand/balance/ETA/readiness | Parts demand, ledger, procurement projections | Quantity/custody reconciliation and confidence |
| UX-V06 | Wholesale candidate/offer/settlement | Wholesale projections | Proposed/requested/acknowledged/settled distinct |
| UX-V07 | Cost/capital/exposure | Governed cost records + CT-10 | Currency and actual/estimate distinction |
| UX-V08 | KPI/target/health | Versioned metric fact + target policy | Envelope, freshness, grade, exclusions, drill-through |
| UX-V09 | Task/blocker/priority | Work Governance + CT-05/06 | Owner, due/escalation, reason, deduplication |
| UX-V10 | Review/approval counts/status | Work Governance CT-07/08 | Viewer-permitted exact records/versions only |
| UX-V11 | Recommendation/confidence | Versioned advisory record CT-09 | Sources, reasons, alternatives, expiry, decision state |
| UX-V12 | Data/integration health | CT-12 + integration registry/reconciliation | Lag, last-good cutoff, impact, owner, recovery |

## Shared action mapping

| Trace ID | Visible action | Command/read behavior | Authority and work effects | Event/integration effect |
| --- | --- | --- | --- | --- |
| UX-A01 | Change location/scope | Refresh permission-equivalent projections | Server-scoped; no domain mutation | Read telemetry only |
| UX-A02 | Search/open record | Authorized search + Vehicle 360/context read | Field/record restrictions preserved | Read telemetry only |
| UX-A03 | Filter/KPI/pipeline/drill-through | Versioned projection query | No broadened permission | Read telemetry; aggregate reconciles |
| UX-A04 | Save/share view | Saved-view command | Sharing scope intersects viewer permission | Audit event; no external effect |
| UX-A05 | Start Workflow | Open permitted catalog, then purpose-built command | May create task/review/approval by workflow | Audit/domain event; outbox only if specified |
| UX-A06 | Review | Review decision command over exact version | Eligible reviewer; does not imply approval | Review/audit event; downstream task as defined |
| UX-A07 | Approve/reject/return | Approval decision command over exact proposal | Amount/field/delegation/four-eyes enforced | Approval/audit event; downstream command remains distinct |
| UX-A08 | Assign/reassign/claim | Work assignment command | Eligible owner, reason/continuity, version check | Task and audit events; notification optional |
| UX-A09 | Resolve blocker/exception | Resolution proposal/verify/close/reopen commands | Evidence and independent verification as applicable | Task/exception/audit events |
| UX-A10 | Export/print | Governed bounded export command | Row/field scope, reason, watermark, limits | Export audit event; no implicit domain change |
| UX-A11 | View Event Log | Permission-scoped event projection | Restricted payloads masked | No mutation |
| UX-A12 | Retry/replay/reconcile | Operations command against exact failed item | Operations capability, reason, idempotency | Retry/replay/verification events; external call only when authorized |

## Workspace command families

| Trace ID | Surface / action family | Record and command owner | Tasks / approvals | Integration boundary |
| --- | --- | --- | --- | --- |
| WF-H01 | Home routing and priority actions | Console composition + owning domain | Reuses global Work Governance | No external mutation from routing |
| WF-L01 | Open/return Control Tower | Console context contract | None | None |
| WF-L02 | Lifecycle corrective/stage action | InventoryUnit or Inventory-to-Frontline purpose-built command | Evidence task/review/approval as policy requires | Provider state never advances lifecycle without acknowledgement |
| WF-A01 | Opportunity/appraisal/bid/commit | Acquisition & Appraisal | Exact proposal approval for limits/commitment | Source/provider request and acknowledgement distinct |
| WF-F01 | Transport/receipt/inspection/recon/frontline | Inventory-to-Frontline | Stage work, exceptions, QC/title/release approvals | Transport/listing/title states reconciled |
| WF-R01 | Reserve/release/sale/delivery/unwind | Retail Completion | Expiry, hold, readiness, unwind/reversal work | CRM/DMS/payment references do not own internal completion |
| WF-S01 | Repair intake/estimate/authorize | RepairOrder/Shop | Estimate/customer/manager approval as applicable | Customer/provider acknowledgement retained |
| WF-S02 | Plan/dispatch/execute/QC/release/close | RepairOrder/RepairJob | Assignment, blockers, QC/rework, close approval | Invoice-ready handoff is not accounting posting |
| WF-P01 | Demand/reserve/release/issue/install/return | Parts | Scarcity/substitution/variance approvals | Parts ledger owns quantity; job owns repair readiness |
| WF-P02 | Requisition/PO/receive/transfer/count/adjust/recovery | Parts | Amount/variance/four-eyes approvals | Vendor request/ack/receipt/credit reconciled |
| WF-W01 | Candidate/appraisal/channel/price/activate | Disposition & Wholesale | Exact channel/price/reserve/activation approval | Publication request/ack/error distinct |
| WF-W02 | Offer/counter/accept/release/sale/settle/reopen | Disposition & Wholesale | Offer/release/sale/write-down approvals | External offer, transfer, title, proceeds reconciled |
| WF-G01 | Policy/capability/authority administration | Policy & Authorization | Four-eyes and effective-date approval | No direct business mutation |

## Workflow Launcher phase-one mapping

The launcher exposes only workflow definitions whose purpose-built form, validation, preview, permission, records, tasks, approvals, audit/events, idempotency, and recovery contract are approved. Generic `change status` or `change stage` intake is prohibited. The detailed field, validation, permission, confirmation, receipt, record, task, approval, and event contracts remain governed by the [Workflow Launcher UX Contract](../INVENTORY_CONSOLE_WORKFLOW_LAUNCHER_UX_CONTRACT.md).

| Launcher ID | Staff choice / form | Primary records and work | Approval / event boundary |
| --- | --- | --- | --- |
| WL-01 | Add / Acquire Vehicle — Acquisition Intake | Vehicle reference, InventoryUnit/state history, configured next action | Threshold/policy exception may route before creation; command/domain/audit/outbox/activity evidence |
| WL-02 | Receive Vehicle — Receipt & Custody Intake | Receipt/custody evidence, custody event, inspection or exception work | Exceptions may route to review; reporting is never suppressed |
| WL-03 | Start Inspection — Inspection Start Intake | Inspection package/template snapshot and assigned checklist | Start is distinct from completed inspection results |
| WL-04 | Request Inventory Recon — Inventory Recon Request | Service Visit, RepairOrder/history, diagnosis/planning work | Estimate/authorization occur later; request does not approve repair |
| WL-05 | Create Repair Order — Repair Order Intake | Service Visit, RepairOrder/history, intake/diagnosis work | Consent and estimate authorization remain later gates |
| WL-06 | Report Blocker — Blocker & Exception Intake | Subject blocker/exception plus response/recovery task | Reporting needs no approval; resolution/override/risk acceptance may |
| WL-07 | Request Approval — Approval Request | Exact domain proposal or linked manager-review item plus approver work | Request leaves subject unchanged or visibly waiting; later decisions are attributable |
| WL-08 | Create General Task — Task Intake | Board-linked task/checklist/collaborators | Creates no domain record or lifecycle transition |
| WL-C01 | Request Parts — Part Demand Intake | Repair Part Demand, readiness evaluation, sourcing/reservation work | Purchase/substitution remains a later authorized decision |
| WL-C02 | Start Quality Control — QC Intake | QC assignment/work item and checklist | QC start is not pass, release, or closure |

WL-C01 and WL-C02 are context-only. Other phase-one choices may also be hidden, disabled with a reason, or context-required according to current record, capability, location, data freshness, and rollout. Exact role/location enablement remains an approval decision; the catalog itself is fixed.

## Open traceability decisions

- Exact launcher phase-one workflow IDs and first command slice.
- Exact stage-to-event mapping and conflict-resolution priority.
- Amount/quantity/field thresholds and four-eyes applicability.
- Actual external systems, acknowledgement semantics, and manual-degraded paths.
- Bulk-action eligibility and maximum bounded volume.
- Notifications, escalation timing, cooldown, and deduplication policies.
- Final field-level privacy/export rules.

No unresolved item may be filled with a UI-only assumption.
# Wave 6 repository conformance amendment — 2026-07-18

IC-002 is now repository-complete. `src/server/inventory-console-wave6/traceability.ts` provides a fail-closed, executable trace catalog for the 11 visible Workflow Launcher actions and seven shared Console experience/authority actions. Every entry maps its surface to an authoritative record, command or query, permission, work effect, domain event, projection, and integration effect; duplicate, missing, or incomplete entries fail the Wave 6 conformance test. Operational integrations and pilot behavior remain subject to their separate evidence gates.
