# Sales Console Implementation Planning Milestones

**Status:** Planning only; no code authorization  
**Product area:** `/sales`  
**Visual reference:** `assets/enterprise-sales-console-review-mockup-v1.png`  
**Prototype foundation:** current `/sales` static prototype  
**Companion docs:** `SALES_UI_IMPLEMENTATION_PLAN.md`, `SALES_DATA_MODEL.md`, `SALES_CONSOLE_PRODUCT_REQUIREMENTS.md`

## 1. Planning intent

This milestone plan explains how to turn the Sales Console from an approved prototype into an enterprise operating system without trying to build everything at once.

The implementation should move in controlled slices:

- first, prove the console shell and visual direction;
- next, connect trusted read models without changing customer, vehicle, finance, or deal records;
- then add governed commands one workflow at a time;
- finally, enable approvals, forecasting, intelligence, integrations, and administration.

Each milestone should be independently reviewable, reversible where possible, and tied to visible operating value.

## 2. Recommended build strategy

Build from low-risk visibility to high-control execution.

| Stage | Strategy | Why |
| --- | --- | --- |
| Prototype | Static UI and approved mockup | Align leadership on what the console should become |
| Read-only pilot | Pull existing data into sales views | Prove usefulness without changing records |
| Controlled workflow | Add limited sales-owned commands | Start operational benefit with audit trail |
| Manager authority | Add approvals, exceptions, overrides | Protect margin, policy, and accountability |
| Cross-domain readiness | Add finance, documents, inventory, delivery signals | Reduce handoff failures |
| Enterprise scale | Add forecasting, admin policy, integrations, analytics | Move from useful console to operating platform |

Do not begin customer messaging, quote submission, vehicle holds, finance decisions, or discount approval automation until the relevant authority and audit milestones are complete.

## 3. Milestone roadmap

| ID | Milestone | Scope | Exit proof |
| --- | --- | --- | --- |
| SAL-IM-000 | Leadership approval baseline | Confirm prototype, mockup, scope, no-code planning boundary, and first pilot audience | Approved mockup, approved first release scope, named business owner |
| SAL-IM-010 | Console shell hardening | Finalize `/sales` navigation, loading/error states, responsive layout, accessibility baseline | Shell loads for sales user, manager user, and unauthorized user path |
| SAL-IM-020 | Visual system extraction | Convert mockup into reusable UI rules, components, spacing, table density, status colors, and page anatomy | UI source-of-truth checklist and component inventory |
| SAL-IM-030 | Sales policy configuration model | Define stages, reason codes, SLA targets, role permissions, approval limits, freshness rules | Signed configuration register with effective-date owner |
| SAL-IM-040 | Read-only Salesperson Today | Populate ranked queue from existing tasks, appointments, customers, and vehicle references | Users can see assigned work without creating or changing sales records |
| SAL-IM-050 | Lead Operations read-only view | Show lead intake health, owner, source, SLA risk, duplicate candidates, and qualification gaps | Lead managers can identify unowned, stale, duplicate, and high-intent leads |
| SAL-IM-060 | Opportunity lifecycle foundation | Introduce sales-owned opportunity record with owner, stage, next action, freshness, and event history | Active opportunities cannot exist without owner, stage, next action |
| SAL-IM-070 | Lead intake and assignment | Add controlled lead creation, dedupe review, assignment, reassignment, and acceptance | New leads become owned opportunities with source and audit trail |
| SAL-IM-080 | Response and outcome workflow | Add structured contact attempt, outcome, next step, no-response, nurture, and disqualification | Every worked lead has outcome evidence and next action or closure reason |
| SAL-IM-090 | Manager Command Center v1 | Add manager queues for SLA risk, unowned work, stale opportunities, approval candidates, and delivery blockers | Managers can drill from each risk metric to exact records |
| SAL-IM-100 | Customer 360 sales lens | Compose sales context from customer, opportunity, appointment, promise, and vehicle references | Sales team sees relationship context without duplicating customer truth |
| SAL-IM-110 | Inventory Intelligence v1 | Add customer-fit vehicle candidates, readiness blockers, alternatives, and availability warnings | Blocked vehicles are never shown as clean recommendations |
| SAL-IM-120 | Deal Desk foundation | Add sales deal workspace with deal stage, participants, vehicle, blockers, current scenario placeholder | A deal can be tracked from opportunity to desk review without finance automation |
| SAL-IM-130 | Quote scenario versioning | Add immutable quote scenario versions, compare view, accepted/superseded states, and estimate labeling | Presented scenarios cannot be edited in place |
| SAL-IM-140 | Approval workflow | Add discount, price, gross band, promise, waiver, and reassignment approval requests | Exceptions require approver, reason, decision, timestamp, and expiry |
| SAL-IM-150 | Finance handoff readiness | Add readiness checklist, missing field/document blockers, finance owner, returned-deal reasons | Finance handoff cannot be submitted until required evidence exists or waiver approved |
| SAL-IM-160 | Promise ledger | Add customer and internal promise capture, owner, due date, status, evidence, and escalation | Closed/delivered deals cannot hide unresolved required promises |
| SAL-IM-170 | Delivery readiness | Add delivery checklist, vehicle readiness, document readiness, customer confirmation, delivery appointment | Delivery Ready requires checklist pass or authorized waiver |
| SAL-IM-180 | Forecast foundation | Add snapshot forecast, closeable deals, confidence, manager override, and change history | Forecast separates system projection from manager judgment |
| SAL-IM-190 | Data quality and reconciliation | Add duplicate review, stale references, invalid states, missing required fields, integration failure queue | Bad sales data becomes visible work, not silent drift |
| SAL-IM-200 | Reporting and performance | Add lead speed, pipeline aging, approval cycle time, deal quality, inventory match conversion, delivery blockers | Managers can inspect performance from metric to source record |
| SAL-IM-210 | Enterprise administration | Add controlled configuration for stages, reasons, queues, SLA, role permissions, approval thresholds | Admin changes are effective-dated, owned, auditable, and reversible |
| SAL-IM-220 | Pilot rollout | Run limited cohort with training, feedback, rollback plan, and daily review | Pilot users complete daily selling loop without side spreadsheets |
| SAL-IM-230 | Production readiness | Harden observability, access, data retention, backup, rollback, support, and release checklist | Leadership signs production release gate |
| SAL-IM-240 | Expansion and optimization | Add advanced intelligence, integrations, coaching analytics, multi-location controls | Console becomes primary sales operating surface |

## 4. First implementation wave

The first wave should stop before sensitive selling actions.

Recommended first wave:

| Milestone | Build result |
| --- | --- |
| SAL-IM-000 | Leadership approves mockup and first release scope |
| SAL-IM-010 | `/sales` shell is reliable and navigable |
| SAL-IM-020 | UI rules and component plan are documented |
| SAL-IM-030 | Sales policy values are decided |
| SAL-IM-040 | Salesperson Today becomes read-only live queue |
| SAL-IM-050 | Lead Operations becomes read-only manager/BDC view |

This gives Time Motor Sales a useful sales command surface without authorizing risky mutations.

Do not include in Wave 1:

- autonomous customer communication;
- quote submission;
- payment or finance decisioning;
- vehicle reservation or hold commitment;
- approval automation;
- production integration writes;
- compensation or payroll logic.

## 5. Second implementation wave

The second wave should introduce controlled sales-owned records and workflow.

Recommended second wave:

| Milestone | Build result |
| --- | --- |
| SAL-IM-060 | Opportunity lifecycle foundation |
| SAL-IM-070 | Lead intake and assignment |
| SAL-IM-080 | Response and outcome workflow |
| SAL-IM-090 | Manager Command Center v1 |
| SAL-IM-100 | Customer 360 sales lens |
| SAL-IM-110 | Inventory Intelligence v1 |

This wave turns the console from a dashboard into an operating workspace.

## 6. Third implementation wave

The third wave should add desking controls, but only with audit and authority.

Recommended third wave:

| Milestone | Build result |
| --- | --- |
| SAL-IM-120 | Deal Desk foundation |
| SAL-IM-130 | Quote scenario versioning |
| SAL-IM-140 | Approval workflow |
| SAL-IM-150 | Finance handoff readiness |
| SAL-IM-160 | Promise ledger |
| SAL-IM-170 | Delivery readiness |

This wave is where the console becomes materially enterprise-grade. It controls the handoffs and exceptions ordinary sales tools usually leave in notes, text messages, or manager memory.

## 7. Fourth implementation wave

The fourth wave should scale management intelligence and operating control.

Recommended fourth wave:

| Milestone | Build result |
| --- | --- |
| SAL-IM-180 | Forecast foundation |
| SAL-IM-190 | Data quality and reconciliation |
| SAL-IM-200 | Reporting and performance |
| SAL-IM-210 | Enterprise administration |
| SAL-IM-220 | Pilot rollout |
| SAL-IM-230 | Production readiness |
| SAL-IM-240 | Expansion and optimization |

This wave prepares the Sales Console to become the store's primary sales operating system.

## 8. Milestone detail template

Each implementation milestone should define:

- business owner;
- engineering owner;
- source-of-truth systems touched;
- screens affected;
- data objects added or read;
- commands allowed;
- commands explicitly prohibited;
- role permissions;
- audit events;
- test scenarios;
- rollout group;
- rollback plan;
- training notes;
- support procedure;
- pilot acceptance evidence.

## 9. Critical decision gates

Do not start a milestone until the required gate is answered.

| Gate | Required before |
| --- | --- |
| Who owns sales policy values? | SAL-IM-030 |
| What is the first response SLA by channel? | SAL-IM-030, SAL-IM-050 |
| Who can create, reassign, and close opportunities? | SAL-IM-060, SAL-IM-070 |
| What customer consent rules block outreach? | SAL-IM-080 |
| Which inventory blockers prevent vehicle presentation? | SAL-IM-110 |
| Which economics are visible by role? | SAL-IM-120, SAL-IM-130 |
| What discount or deal terms need approval? | SAL-IM-140 |
| What fields/documents are required before finance handoff? | SAL-IM-150 |
| What promises block delivery? | SAL-IM-160, SAL-IM-170 |
| Who can override forecast? | SAL-IM-180 |
| Who can change configuration? | SAL-IM-210 |

## 10. First release candidate

The first release candidate should be:

```text
read-only sales console
  -> approved enterprise visual direction
  -> live ranked seller queue
  -> live lead operations queue
  -> manager risk rail
  -> customer and vehicle references
  -> no customer messaging
  -> no quote submission
  -> no vehicle holds
  -> no finance decisions
```

This is the best early release because it gives immediate operational visibility while keeping risk low.

## 11. Pilot acceptance checklist

Before pilot:

- Salesperson can open `/sales` and understand top priorities within 30 seconds.
- Manager can identify SLA risk, stale opportunities, approvals, and delivery blockers.
- Every visible item links to a source record or a planned placeholder with clear status.
- No active opportunity appears without owner, stage, and next action once opportunity lifecycle is enabled.
- No blocked vehicle appears as cleanly sellable.
- No approval-sensitive action can be completed without authority.
- Every command has audit event, reason where required, and rollback or correction path.
- Pilot users can complete the daily sales rhythm without side spreadsheets.

## 12. Recommended next planning action

Before writing more code, decide the first wave scope:

1. Confirm `assets/enterprise-sales-console-review-mockup-v1.png` as the approved visual reference.
2. Choose whether Wave 1 should use real read-only data or remain static for stakeholder review.
3. Assign owners for sales policy values: stages, reasons, SLA, permissions, and approval thresholds.
4. Select the pilot group: one salesperson, one manager, one BDC/admin support user if applicable.
5. Define the first five reports leadership wants from the console.
