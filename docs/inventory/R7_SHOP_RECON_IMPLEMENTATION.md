# R7 Shop & Recon Implementation

Status: adopted 16-stage taxonomy and governed operational lifecycle implemented; rollout pending
Roadmap release: R7  
Milestone: M7  
Slices: IC-070 through IC-079

## 1. Outcome

R7 provides one permission-aware Shop & Recon operating entry point at `/vehicles/shop-recon`. The unified vehicle card now has a governed 16-stage lifecycle aggregate for stage control, attributable drafts, scope versions, overrides, and immutable stage history. Existing RepairOrder, RepairJob, inspection, estimate, authorization, dispatch, labor, QC, release, and custody records remain the authoritative operational evidence used by every stage gate.

The approved landing composition now includes:

- open-work, projected-on-time, waiting-parts, assignment, and risk indicators;
- a mutually exclusive eight-stage pipeline whose count reconciles to open work;
- explicit Customer Repair and Inventory Recon workload totals;
- priority work ordered by risk, parts constraint, and target;
- direct entry to Parts Operations, RepairOrder intake, planning, dispatch/execution, production metrics, Quality Control, advisor work, approvals, comebacks, invoice-ready close, and the Inventory Control Tower;
- visible data freshness, contract version, disabled-adapter state, advisory Parts recommendation policy, and prohibition of automatic discipline.

The existing production-measurement workspace remains available at `/vehicles/shop-metrics`. Dispatch and technician execution continue to share the established `/vehicles/shop-dispatch` workspace instead of duplicating assignment or labor state.

## 2. Slice conformance

| Slice | Repository implementation |
| --- | --- |
| IC-070 | Existing governed RepairOrder intake supports customer repair and inventory recon, identity, concern, consent, keys, transportation, accountable owner, target, next action, idempotency, and immutable state history. |
| IC-071 | Existing inspection, diagnosis, estimate, change-order, evidence, uncertainty, and exact authorization contracts remain authoritative. |
| IC-072 | Existing RepairJob, procedure, dependency, skill, bay, tool, Parts-readiness, priority, and conflict contracts remain authoritative. |
| IC-073 | Existing planning, qualified dispatch, resource booking, override reason, continuity, and optimistic-concurrency controls remain authoritative. |
| IC-074 | Existing technician acknowledgement, labor clock, pause/reason/resume/finish, correction, evidence, and blocker controls remain authoritative. |
| IC-075 | Existing advisor updates, customer-facing summaries, promise risk, approvals, contact evidence, transportation, and delivery-readiness controls remain authoritative. |
| IC-076 | Existing QC, rework, release, comeback review, responsibility, cost, and outcome controls remain authoritative. |
| IC-077 | Existing production snapshot formulas, confidence, exclusions, work class, first-pass yield, and quality adjustment remain authoritative; automatic discipline is prohibited. |
| IC-078 | Existing authorized labor, installed-Part custody, readiness, release, handoff, acknowledgement, mismatch, close, and controlled reopen gates remain authoritative. |
| IC-079 | The approved landing, workload separation, work queue, reviews/approvals, Parts dependencies, deeper-workspace routes, and Inventory Control Tower handoff are implemented. |

## 3. Architecture and access boundary

The landing read path is:

`Shop & Recon page or GET /api/shop-recon` → `getShopReconLanding` → capability authorization → existing Shop completion repository overview → pure R7 projection → UI.

The projection adds no mutation path. The same `REPAIR_ORDER_VIEW` capability and organization boundary used by the established Shop workspace protect the read. Commands continue through their existing domain services, capability grants, rollout checks, idempotency keys, expected aggregate versions, immutable events, and reason capture.

## 4. Governed transition policy

- Any user who is authorized to access the repair order may save the current stage draft. Every revision records the saving user, time, reason, checklist, form values, and evidence references.
- A save never completes a checklist, approves work, changes authorization, moves a vehicle, or advances the stage.
- Normal movement is sequential. Controlled backward movement and reopening require a current General Manager override.
- General Manager exceptions are limited to WIP, target time, queue order, noncritical documentation, temporary resources, controlled backward movement, and reopening. Identity, custody, safety, customer authorization, Inventory spending authority, technician qualification, required procedures/legal evidence, failed QC, failed road test, and receiving-owner acceptance remain non-overridable.
- A changed-scope submission preserves the original scope, creates a new version, stops affected repair jobs, and moves the card to Findings & Repair Plan. The card must pass the revised plan, exact-version authorization, Parts/resource readiness, dispatch, and repair gates before the scope record resolves and execution resumes.
- Failed QC or road test preserves the failed inspection, records reason codes and rework instructions, resets the affected job for repair, and synchronizes the same vehicle card to `REWORK` at Repair Execution. A fresh technician-complete record and fresh QC inspection are required. Pre-release rework is not classified as a comeback and does not automatically create a customer charge.
- Shop targets and the original customer/frontline commitment continue aging through scope change and QC rework.

## 5. Operational Stages 1–7

Stages 1–7 now use a controlled three-step record on the unified vehicle card: any authorized card user may save an attributable draft; the named stage authority publishes the latest draft as operational evidence; the authority then completes the stage after the server rechecks all gates. Editing and saving after publication invalidates the completion-ready state until that newest revision is republished.

| Stage | Operational record created or updated | Completion control |
| --- | --- | --- |
| 1. Service / Recon Job Intake | Lane, vehicle, requester, concern, commitment and accountable intake owner | All six intake actions and their evidence are required |
| 2. Job Scope Definition | Versioned outcome, inclusions, exclusions, work intent and scope authority | Silent scope expansion is prohibited |
| 3. Work Order Creation | Controlled repair order linked to the exact scope and requested operations | The work order must be complete before physical intake |
| 4. Vehicle Intake & Custody | Identity, condition, keys, location, restrictions and immutable custody check-in | At least one key and accepted custody are required |
| 5. Safety & Mobility Triage | Mobility, hazards, containment and operational priority | A Do Not Move decision quarantines the card until a cleared triage is republished |
| 6. Inspection & Concern Verification | Versioned inspection, measurements and concern-verification result | Complete checklist, fields and evidence are required |
| 7. Diagnosis | Versioned tests, measurements, supported cause, uncertainty, correction and recommendation | Walter Hernandez or another qualified assigned technician publishes the technical record |

Every publication stores the draft revision, publisher, timestamp, reason, source references, scope version, and an immutable lifecycle event. Prior records remain available for audit rather than being overwritten.

### Active-stage operating workspace

Stages 1–4 now use the first version of the Inventory-style staff operating workspace. The selected stage remains part of the same unified vehicle card, but active work is separated into four deliberate sections:

- **Work to Perform** — staff enter the facts, perform each named operation, and explicitly record it. Changing a supporting fact reopens the affected operation.
- **Stage Activity** — shows attributable operations and corrections alongside governed save, publication, and movement history.
- **Documents & Evidence** — holds the stage-specific photos, documents, measurements, and source references produced by the work.
- **Stage Completion** — summarizes readiness and keeps saving, publishing, and advancing separate so ordinary work entry cannot accidentally move the vehicle.

This design is implemented for Stages 1–4 for visual and operational refinement before the same interaction model is extended across Stages 5–16.

## 6. Operational Stages 8–12

Stages 8–12 extend the same controlled draft, publication, and completion pattern without duplicating the established planning, Parts, procedure, qualification, resource, or dispatch systems. The unified vehicle card is the control layer; the specialist workspace records remain authoritative.

| Stage | Authoritative validation and publication |
| --- | --- |
| 8. Findings & Repair Plan | Binds verified findings to the current presented, unexpired estimate version and verifies the exact total and labor-guide minutes entered on the card. |
| 9. Authorization | Binds the decision to the exact repair-plan and estimate version and verifies disposition, approved amount, decision reference, and lane authority. Pending or declined work cannot advance. |
| 10. Parts & Resource Readiness | Verifies authorized repair jobs, complete Parts reservations, effective procedures, at least one qualified technician candidate, and matching active bay/tool resources. |
| 11. Dispatch & Work Staging | Publishes readiness and binds every active repair job to its governed technician, bay, schedule, keys, parts, instructions and active/staged dispatch record before execution can begin. The two-bay WIP limit remains enforced unless a current General Manager WIP exception exists. |
| 12. Repair Execution | Reconciles the card status with every repair job, requires attributable labor events and records current job and labor-clock versions. A new finding must use the governed scope-change action. |

The card links directly to the Repair Workbench for estimate and authorization work, Parts Operations for reservation work, and Shop Dispatch for procedure, qualification, bay, and assignment work. Any downstream change invalidates the latest card draft until it is saved and republished.

## 7. Operational Stages 13–16

Stages 13–16 close the controlled shop loop while preserving the specialist execution, QC, release, delivery-readiness, and custody records as the operational source of truth.

| Stage | Authoritative validation and publication |
| --- | --- |
| 13. Technician Completion | Walter Hernandez or another assigned qualified technician publishes final measurements, completion notes, current job versions and technician sign-off. Partial or blocked work remains in Stage 12. |
| 14. Quality Control & Road Test | Brock or another qualified independent QC authority verifies every latest QC inspection and road-test result. Failure returns the same card to Repair Execution through the controlled rework loop. |
| 15. Release & Handover Readiness | Verifies a current READY delivery evaluation tied to the release authorization, reconciles final scope, cost, checked-in keys, documents, lane destination and receiving party. |
| 16. Vehicle Handover & Shop Exit | Enforces the lane-specific destination, records receiver acceptance and creates one attributable custody handoff. Republishing does not duplicate the physical exit event. |

Completing Stage 16 closes the Shop & Recon lifecycle only. An Inventory Recon vehicle returns to the Inventory lifecycle; a Customer Repair vehicle continues through the advisor/customer financial and delivery close process. This prevents a shop exit from falsely representing that every downstream business obligation is complete.

## 8. Operational pilot

The repeatable local pilot setup creates two clearly marked, non-production repair orders at Stage 1:

- `PILOT-CUST-001` — Customer Repair pilot for customer authorization, promise, changed scope, QC/road-test rework, key reconciliation, and advisor/customer handoff.
- `PILOT-INV-001` — Inventory Recon pilot for spending authority, Parts constraints, the two-bay WIP limit, technician/bay assignment, and return to the Inventory lifecycle.

Run `npm run db:seed:shop-recon-pilot` after the foundation development seed. The command creates missing pilot records, aligns the development technician identity to Walter Hernandez, and preserves lifecycle progress when rerun. It does not reset an active pilot.

Pilot cards show a visible Operational Pilot badge, five journey-validation checkpoints spanning all 16 stages, the expected lane-specific exit, and expandable exception drills with the expected system control. All stage work still uses the production-shaped save, publish, complete, scope-change, QC, override, and custody policies.

## 9. Projection rules

- Every open RepairOrder occupies exactly one displayed pipeline stage. Later operational states take precedence over earlier planning states.
- Waiting on Parts is true when a job explicitly waits for Parts or required quantity exceeds reserved quantity.
- Needs assignment is true when a ready RepairJob has no active or staged dispatch.
- At risk is true when the target is overdue, the customer promise is within four hours, or the operating state is not active.
- Projected on time is the percentage of open orders not currently classified at risk. It is an operating projection, not a guaranteed promise.
- Estimate approval is pending when a presented estimate has no accepted or partial authorization.
- Quality-review count is based on RepairJobs ready for QC; comeback-review count uses open comeback cases.
- Customer Repair and Inventory Recon are never merged into one workload total without their origin remaining visible.

## 10. Verification evidence

- TypeScript typecheck: passed.
- Focused Shop & Recon Stage 1–16 policy, workflow, foundation, execution, completion, QC, close, and vehicle-card tests: passed.
- Full lint: passed with zero warnings.
- Prisma schema validation: passed.
- Production build: passed; 144 routes generated, including `/vehicles/shop-production`, `/vehicles/shop-metrics`, and `/api/shop-recon`.
- Prisma migrations support the governed lifecycle, immutable draft/event history, GM overrides, versioned scope changes, and immutable Stage 1–16 evidence publication.

## 11. Activation boundary

This repository state does not authorize production activation. The following remain pending:

- representative end-to-end Customer Repair and Inventory Recon tabletop evidence;
- real concurrent dispatch, reservation, approval, QC, close, and reopen exercises;
- role-by-role accessibility and mobile technician validation;
- production-volume performance and projection-freshness validation;
- external DMS, service, payment, messaging, accounting, supplier, and bay/tool-provider adapters;
- pilot approval, operating training, support/runbook acceptance, and monitored rollout.

Until those gates pass, provider-backed actions remain disabled and no metric may automatically trigger discipline or compensation action.
