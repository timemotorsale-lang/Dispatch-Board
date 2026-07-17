# Shop and Repair Optimization Program

**Status:** Complete planning baseline; dealership approval required; no new optimization behavior activated  
**Version:** 0.1.0  
**Established:** 2026-07-16  
**Proposed service owner:** Fixed Operations / Shop Manager  
**Proposed policy owner:** General Manager / Operations Manager

## Purpose

This package defines how Time Motor Sales can optimize customer-pay service and dealership inventory reconditioning without sacrificing safety, authorization, quality, customer commitments, truthful pricing, staff fairness, or auditability.

It is the planning source of truth for shop-flow, capacity, dispatch, parts readiness, margin governance, technician/advisor assistance, customer-risk detection, predictive service outreach, and continuous improvement. It does not activate algorithms, change pricing, contact customers, assign technicians, purchase parts, or release vehicles.

## Governing precedence

1. Law, safety, privacy, contracts, OEM requirements, and approved dealership policy.
2. [`Enterprise Optimization Constitution`](../ENTERPRISE_OPTIMIZATION_CONSTITUTION.md).
3. [`Vehicle Operations Enterprise Architecture`](../inventory/INVENTORY_ENTERPRISE_ARCHITECTURE.md).
4. [`Enterprise Common Work and Service Model`](../enterprise-optimization/COMMON_WORK_AND_SERVICE_MODEL.md).
5. Approved Inventory-to-Frontline controls for dealership-owned recon work.
6. This package and approved location policy versions.

The program reuses canonical `Vehicle`, `ServiceVisit`, `RepairOrder`, `RepairJob`, `Task`, `Appointment`, `Resource`, `Part`, `Evidence`, `Decision`, `Event`, and `Audit` foundations. It must not create a second vehicle, repair-order, appointment, inventory, task, messaging, or authorization system.

## Operating lanes

| Lane | Outcome | Governing relationship |
| --- | --- | --- |
| Customer-pay repair | Safely diagnose, authorize, repair, verify, communicate, deliver, and retain | Shop owns work; customer authority governs scope and price |
| Inventory recon | Return an acquired unit to the approved inventory lifecycle at verified QC handoff | Shop owns diagnosis/repair/QC; Inventory owns capital, disposition, and frontline release |
| Internal/fleet work | Maintain dealership-controlled vehicles under an explicit internal authority policy | Shop owns execution; named internal owner authorizes scope |

## Package map

| Document | Purpose |
| --- | --- |
| [`PROGRAM_CHARTER.md`](PROGRAM_CHARTER.md) | Outcomes, scope, boundaries, principles, roles, and implementation gates. |
| [`OPERATING_MODEL.md`](OPERATING_MODEL.md) | End-to-end shop lifecycle, queues, decision points, handoffs, and staff options. |
| [`ALGORITHM_CATALOG.md`](ALGORITHM_CATALOG.md) | Complete registry for flow, capacity, pricing, assistance, customer intelligence, and learning algorithms. |
| [`AUTHORITY_AND_GUARDRAIL_MATRIX.md`](AUTHORITY_AND_GUARDRAIL_MATRIX.md) | Human authority, prohibited automation, overrides, financial controls, privacy, and safety. |
| [`DATA_SOURCE_AND_CONFIDENCE_MATRIX.md`](DATA_SOURCE_AND_CONFIDENCE_MATRIX.md) | Authoritative sources, freshness, fact classes, degraded behavior, and reconciliation. |
| [`STAFF_EXPERIENCE.md`](STAFF_EXPERIENCE.md) | One-shop-workspace UX, role views, recommendation cards, explanations, and accessibility. |
| [`SCENARIO_AND_DECISION_CATALOG.md`](SCENARIO_AND_DECISION_CATALOG.md) | Normal, exception, degraded, safety, financial, and customer scenarios with staff choices. |
| [`MEASUREMENT_AND_CALIBRATION.md`](MEASUREMENT_AND_CALIBRATION.md) | KPI definitions, fairness/quality protections, outcome attribution, drift, and change control. |
| [`WORKSHOPS_01_08_PROGRAM.md`](WORKSHOPS_01_08_PROGRAM.md) | Consecutive approval workshops, decisions, participants, outputs, and exit gates. |
| [`APPROVAL_REGISTER.md`](APPROVAL_REGISTER.md) | All open dealership decisions required before implementation or activation. |
| [`IMPLEMENTATION_AND_PILOT_ROADMAP.md`](IMPLEMENTATION_AND_PILOT_ROADMAP.md) | Safe vertical slices from instrumentation through monitored decision support. |
| [`TRACEABILITY_MATRIX.md`](TRACEABILITY_MATRIX.md) | Workstream-to-algorithm, decision, scenario, workshop, outcome, and implementation mapping. |

## Six workstreams

1. Shop Flow and WIP Control.
2. Capacity, Dispatch, and Scheduling.
3. Parts and Repair Execution.
4. Pricing and Margin Governance.
5. Technician and Advisor Assistance.
6. Customer Intelligence and Retention.

## Delivery rule

No advanced model should precede reliable operational facts. The required sequence is:

```text
policy and authority
-> authoritative events and clocks
-> readiness and hard gates
-> deterministic recommendations
-> shadow measurement
-> manager-confirmed pilot
-> controlled expansion
-> predictive assistance only when data is sufficient
```

## Planning-complete definition

This package is planning-complete when every proposed capability has:

- a defined purpose and prohibited use;
- triggers, inputs, source authority, freshness, and confidence behavior;
- eligibility and non-waivable gates before ranking;
- staff options, approval and override rules;
- stable reason codes and a human explanation;
- degraded, correction, cancellation, and recovery paths;
- measurable quality, flow, financial, customer, and fairness outcomes;
- scenario tests, pilot boundaries, pause, rollback, and expansion gates.

Planning completeness is not production approval or implementation evidence.
