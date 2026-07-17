# Inventory-to-Frontline Workflow Program

**Status:** Catalog-complete planning draft; dealership approval required; no workflow behavior activated  
**Version:** 0.1.0  
**Established:** 2026-07-15  
**Workflow owner:** Inventory Manager (proposed; approval required)  
**Policy owner:** General Manager / Operations Manager (proposed; approval required)

## Purpose

This package is the source of truth for the Time Motor Sales Inventory-to-Frontline workflow. It defines how an authoritative acquisition becomes a controlled, evidence-backed, frontline-ready retail inventory unit through adaptive staff decisions, accountable work, hard gates, exceptions, and manager authority.

The package does not activate application behavior, approve dealership policy, or claim that external integrations are available. Values marked `PROPOSED` or `TBD` must not become production defaults without named policy-owner approval.

## Governing precedence

1. Law, safety, privacy, contractual obligations, and binding dealership policy.
2. [`Enterprise Optimization Constitution`](../../ENTERPRISE_OPTIMIZATION_CONSTITUTION.md).
3. [`Vehicle Operations Enterprise Architecture`](../INVENTORY_ENTERPRISE_ARCHITECTURE.md).
4. [`Enterprise Common Work and Service Model`](../../enterprise-optimization/COMMON_WORK_AND_SERVICE_MODEL.md).
5. This package and its approved versions.
6. Configured location policies and staff-facing recommendations.

Existing canonical `Vehicle`, `InventoryUnit`, lifecycle, task, command, event, audit, evidence, and rollout foundations remain authoritative. This program must reuse them and must not create a second vehicle identity, inventory lifecycle, or task system.

## Package map

| Document | Purpose |
| --- | --- |
| [`WORKFLOW_SPECIFICATION.md`](WORKFLOW_SPECIFICATION.md) | Outcome, scope, state model, stages, gates, clocks, invariants, and lifecycle behavior. |
| [`ACQUISITION_TRANSPORT_DECISION_CATALOG.md`](ACQUISITION_TRANSPORT_DECISION_CATALOG.md) | Fully modeled first vertical slice: acquisition validation through transportation handoff to receipt. |
| [`RECEIPT_CUSTODY_DECISION_CATALOG.md`](RECEIPT_CUSTODY_DECISION_CATALOG.md) | Fully modeled second vertical slice: physical arrival and custody through Inspection and Triage handoff. |
| [`INSPECTION_TRIAGE_DECISION_CATALOG.md`](INSPECTION_TRIAGE_DECISION_CATALOG.md) | Fully modeled third vertical slice: inspection selection/readiness through Recon Planning or an approved alternate route. |
| [`RECON_PLANNING_APPROVAL_DECISION_CATALOG.md`](RECON_PLANNING_APPROVAL_DECISION_CATALOG.md) | Fully modeled fourth vertical slice: inspection findings and diagnosis through authorized jobs and Parts/Repair handoff. |
| [`PARTS_REPAIR_EXECUTION_DECISION_CATALOG.md`](PARTS_REPAIR_EXECUTION_DECISION_CATALOG.md) | Fully modeled fifth vertical slice: authorized jobs through controlled parts/labor execution and QC handoff. |
| [`QUALITY_SAFETY_VERIFICATION_DECISION_CATALOG.md`](QUALITY_SAFETY_VERIFICATION_DECISION_CATALOG.md) | Fully modeled sixth vertical slice: per-job QC, failed-work recovery, operational repair release, and downstream inventory handoff. |
| [`TITLE_DOCUMENT_READINESS_DECISION_CATALOG.md`](TITLE_DOCUMENT_READINESS_DECISION_CATALOG.md) | Fully modeled seventh vertical slice: policy-driven title/document requirements, external dependencies, readiness, and merchandising handoff. |
| [`MERCHANDISING_PRICING_DECISION_CATALOG.md`](MERCHANDISING_PRICING_DECISION_CATALOG.md) | Fully modeled eighth vertical slice: verified vehicle content, media, price approval, channel reconciliation, and Frontline Release Review handoff. |
| [`FRONTLINE_RELEASE_REVIEW_DECISION_CATALOG.md`](FRONTLINE_RELEASE_REVIEW_DECISION_CATALOG.md) | Fully modeled ninth vertical slice: complete readiness-package review, frontline authorization, availability reconciliation, suspension, and reinstatement. |
| [`CROSS_CATALOG_CONSISTENCY_AND_APPROVAL_REVIEW.md`](CROSS_CATALOG_CONSISTENCY_AND_APPROVAL_REVIEW.md) | End-to-end handoff audit, shared invariants, findings, approval dependencies, workshop sequence, and current no-go/go decision. |
| [`APPROVAL_WORKSHOP_01_PROGRAM_SCOPE_PILOT_CHARTER.md`](APPROVAL_WORKSHOP_01_PROGRAM_SCOPE_PILOT_CHARTER.md) | Decision-ready recommendations and capture sheet for program scope, first code boundary, pilot cohort, triggers, thresholds, and rollback authority. |
| [`APPROVAL_WORKSHOP_02_ENTERPRISE_ROLE_RESPONSIBILITY_CATALOG.md`](APPROVAL_WORKSHOP_02_ENTERPRISE_ROLE_RESPONSIBILITY_CATALOG.md) | Workshop 2A role catalog: governance and lifecycle roles, proposed staff mapping, responsibility/handoff boundaries, separation of duties, delegation, coverage, workspace access, gaps, stress tests, and decisions `ITF-APR-020`-`025`. |
| [`APPROVAL_WORKSHOP_02B_AUTHORITY_FINANCIAL_CONTROL_MATRIX.md`](APPROVAL_WORKSHOP_02B_AUTHORITY_FINANCIAL_CONTROL_MATRIX.md) | Workshop 2B authority and financial controls: command-specific authority, limits, cost states/classes, quotes, reapproval, cumulative exposure, anti-splitting, economics/disposition review, emergency containment, audit, stress tests, and decisions `ITF-APR-030`-`036`. |
| [`APPROVAL_WORKSHOP_02C_EVIDENCE_PRIVACY_SECURITY_MATRIX.md`](APPROVAL_WORKSHOP_02C_EVIDENCE_PRIVACY_SECURITY_MATRIX.md) | Workshop 2C evidence/privacy/security controls: common evidence contract, criticality and states, first-slice requirements, roadworthiness/driver/condition evidence, classification, access, retention, legal hold, correction/quarantine, incidents, stress tests, and decisions `ITF-APR-050`-`056`. |
| [`APPROVAL_WORKSHOP_02D_TIMING_ESCALATION_NOTIFICATION_COVERAGE_MATRIX.md`](APPROVAL_WORKSHOP_02D_TIMING_ESCALATION_NOTIFICATION_COVERAGE_MATRIX.md) | Workshop 2D timing and escalation controls: calendars, clock contracts, segmented targets, pickup/delivery variance, bounded pauses, escalation/acknowledgement, notifications, quiet hours, coverage, degraded behavior, stress tests, and decisions `ITF-APR-040`-`045`. |
| [`APPROVAL_WORKSHOP_02E_SOURCE_AUTHORITY_INTEGRATION_RECONCILIATION_MATRIX.md`](APPROVAL_WORKSHOP_02E_SOURCE_AUTHORITY_INTEGRATION_RECONCILIATION_MATRIX.md) | Workshop 2E source/integration controls: field authority, acquisition/identity/location/custody sources, provider states, DMS/accounting/website boundaries, freshness, conflict, idempotency, degraded/manual fallback, reconciliation, stress tests, and decisions `ITF-APR-060`-`065`. |
| [`APPROVAL_WORKSHOP_02F_CONSOLIDATED_DECISION_READOUT.md`](APPROVAL_WORKSHOP_02F_CONSOLIDATED_DECISION_READOUT.md) | Workshop 2F closeout: consolidated readout for all 32 Workshop 2 decisions, decision rules, participants, consistency checks, stress tests, sign-off, and readiness decision. |
| [`WORKSHOP_02_GAP_REGISTER.md`](WORKSHOP_02_GAP_REGISTER.md) | Workshop 2 unresolved-control register with severity, containment, owners, closure evidence, and slice impact. |
| [`WORKSHOP_02_SLICE_READINESS_MATRIX.md`](WORKSHOP_02_SLICE_READINESS_MATRIX.md) | Workshop 2 readiness assessment across all nine lifecycle slices and the Workshop 3 entry gate. |
| [`PRE_WORKSHOP_03_RECOMMENDED_DISPOSITION_LEDGER.md`](PRE_WORKSHOP_03_RECOMMENDED_DISPOSITION_LEDGER.md) | Recommended dispositions and safe defaults for all 50 Workshop 1/2 prerequisite decisions, leaving only authorized signature fields. |
| [`PRE_WORKSHOP_03_ENTRY_GATE_RECORD.md`](PRE_WORKSHOP_03_ENTRY_GATE_RECORD.md) | Final confirmation that all planning steps and nine lifecycle slice catalogs are complete before Workshop 3, with authorization and no-code boundaries. |
| [`APPROVAL_WORKSHOPS_03_08_PROGRAM_INDEX.md`](APPROVAL_WORKSHOPS_03_08_PROGRAM_INDEX.md) | Consolidated names, decision/slice coverage, execution sequence, package links, and readiness status for Workshops 3-8. |
| [`APPROVAL_WORKSHOP_03_RECEIPT_CUSTODY_INSPECTION_SAFETY.md`](APPROVAL_WORKSHOP_03_RECEIPT_CUSTODY_INSPECTION_SAFETY.md) | Workshop 3 decisions `080`-`099`: Receipt/Custody and Inspection/Triage approval. |
| [`APPROVAL_WORKSHOP_04_RECON_PARTS_REPAIR_QC.md`](APPROVAL_WORKSHOP_04_RECON_PARTS_REPAIR_QC.md) | Workshop 4 decisions `100`-`129`: recon authorization, parts/repair execution, QC/rework and operational release. |
| [`APPROVAL_WORKSHOP_05_TITLE_DOCUMENT_READINESS.md`](APPROVAL_WORKSHOP_05_TITLE_DOCUMENT_READINESS.md) | Workshop 5 decisions `130`-`139`: title/document applicability, custody, external dependencies and readiness. |
| [`APPROVAL_WORKSHOP_06_MERCHANDISING_PRICING_CHANNELS.md`](APPROVAL_WORKSHOP_06_MERCHANDISING_PRICING_CHANNELS.md) | Workshop 6 decisions `140`-`149`: verified facts, media/content, price, publication and channel reconciliation. |
| [`APPROVAL_WORKSHOP_07_FRONTLINE_RELEASE_AVAILABILITY_SUSPENSION.md`](APPROVAL_WORKSHOP_07_FRONTLINE_RELEASE_AVAILABILITY_SUSPENSION.md) | Workshop 7 decisions `150`-`159`: whole-package release, availability, verification, suspension and reinstatement. |
| [`APPROVAL_WORKSHOP_08_ENTERPRISE_TABLETOP_PILOT_FINAL_SIGNOFF.md`](APPROVAL_WORKSHOP_08_ENTERPRISE_TABLETOP_PILOT_FINAL_SIGNOFF.md) | Workshop 8 end-to-end case suite, audit/usability validation, pilot readiness and final per-slice sign-off. |
| [`OPERATING_CONTROLS.md`](OPERATING_CONTROLS.md) | Roles, authority, separation of duties, evidence, exceptions, timing, financial controls, and policy configuration. |
| [`STAFF_EXPERIENCE.md`](STAFF_EXPERIENCE.md) | How staff and managers access, understand, and operate adaptive workflow decisions. |
| [`ACCEPTANCE_AND_PILOT_PLAN.md`](ACCEPTANCE_AND_PILOT_PLAN.md) | Scenario tests, shadow/manual pilot, activation, monitoring, pause, rollback, and expansion gates. |
| [`APPROVAL_REGISTER.md`](APPROVAL_REGISTER.md) | Open dealership decisions and the documentation-to-code approval gate. |
| [`approval-execution/README.md`](approval-execution/README.md) | Complete AE-0–AE-9 execution program, 130-decision ledger, master resolution, nine separate implementation handoffs, tabletop, gaps, readiness, pilot and traceability records. |
| [`approval-decisions/README.md`](approval-decisions/README.md) | Actual decision-execution workspace with AE-0 authority record, Slice 1's 50-decision gate, signature journal and separate implementation-authorization resolution. |

## Delivery sequence

1. Use the completed cross-catalog review as the controlled approval agenda.
2. Execute approval workshops 1-7 and record every decision in the Approval Register.
3. Run the cross-functional tabletop sign-off against representative cases.
4. Approve roles, evidence, timing, financial authority, legal/title applicability, public content/price, critical gates, and exception policy.
5. Approve the staff experience, terminology, acceptance evidence, pilot, pause, and rollback criteria.
6. Design and implement one approved vertical slice from confirmed acquisition through Receipt and Custody handoff.
7. Run manager-confirmed manual-start and shadow-trigger pilots without activating later slices.
8. Expand stage-by-stage only after the prior slice passes code, verification, pilot, and activation gates.

## Implementation boundary

The first code slice, when approved, ends at an attributable `Receipt and Custody` handoff. The second completes Receipt and Custody and hands the vehicle to Inspection and Triage. The third accepts inspection evidence and routes each finding. The fourth builds and authorizes a versioned recon plan, creates traceable authorized jobs, and hands them to Parts and Repair Execution or an approved alternate path. The fifth controls parts sourcing, receipt, reservation, custody, dispatch, labor, repair evidence, and job completion through an attributable QC handoff. The sixth independently verifies each job, controls failed-QC rework, and authorizes operational release from repair to the correct downstream inventory owner. The seventh applies approved title/document requirements, controls evidence and external dependencies, and hands an eligible unit toward merchandising or another approved route. The eighth verifies vehicle facts, creates and approves media/content, controls human price approval, reconciles channel publication, and hands the package to Frontline Release Review. The ninth independently evaluates all lifecycle gates, records immutable frontline authorization, reconciles placement/availability, and controls post-release suspension/reinstatement. It does not provide legal conclusions, autonomously price/publish, reserve/sell/deliver a vehicle, or make readiness permanent.

## Definition of a catalog-complete stage

A stage is ready for code only when it has:

- authoritative entry trigger and duplicate prevention;
- explicit staff decisions and context-sensitive options;
- required facts and evidence classifications;
- one accountable owner for every open work item or exception;
- dependency, timing, pause, timeout, and escalation behavior;
- hard gates, permission checks, approval and override rules;
- cancellation, correction, reversal, recovery, and integration-degraded paths;
- event, audit, outcome, and measurement contracts;
- loading, empty, stale, conflict, denied, failure, and recovery UI states;
- acceptance scenarios traceable to decision and rule identifiers.

## Change control

Every change must record the document version, policy owner, effective scope, rationale, affected decision/rule identifiers, compatibility impact, and whether in-flight cases retain their original workflow version. Historical workflow instances and evidence must not be silently reinterpreted by later catalog revisions.
