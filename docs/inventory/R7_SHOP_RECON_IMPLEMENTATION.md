# R7 Shop & Recon Implementation

Status: governed lifecycle and operational Stages 1–7 implemented; activation pending
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
- A changed-scope submission preserves the original scope, creates a new version, stops affected repair jobs, and moves the card to Findings Verification. The card must pass the revised plan, exact-version authorization, Parts/resource readiness, dispatch, and repair gates before the scope record resolves and execution resumes.
- Failed QC or road test preserves the failed inspection, records reason codes and rework instructions, resets the affected job for repair, and synchronizes the same vehicle card to `REWORK` at Repair Execution. A fresh technician-complete record and fresh QC inspection are required. Pre-release rework is not classified as a comeback and does not automatically create a customer charge.
- Shop targets and the original customer/frontline commitment continue aging through scope change and QC rework.

## 5. Operational Stages 1–7

Stages 1–7 now use a controlled three-step record on the unified vehicle card: any authorized card user may save an attributable draft; the named stage authority publishes the latest draft as operational evidence; the authority then completes the stage after the server rechecks all gates. Editing and saving after publication invalidates the completion-ready state until that newest revision is republished.

| Stage | Operational record created or updated | Completion control |
| --- | --- | --- |
| 1. Shop Entry | Identity match against the canonical vehicle, repair order, and service visit | A mismatch cannot be published or overridden |
| 2. Custody & Check-In | Key count/tag, custody restrictions, and immutable vehicle custody check-in | At least one key and accepted custody are required |
| 3. Lane & Scope Confirmation | Inventory Recon or Customer Repair lane plus frozen initial scope version | Lane must match the repair-order origin |
| 4. Safety & Priority Triage | Mobility, hazards, and operational priority | “Do not move” quarantines and blocks the card until a cleared triage is republished |
| 5. Inspection | Versioned inspection and accepted odometer observation | Complete checklist, fields, and evidence are required |
| 6. Diagnosis | Versioned diagnosis, tests, measurements, supported cause, uncertainty, correction, and recommendation | Walter Hernandez or another qualified assigned technician publishes the technical record |
| 7. Findings Verification | Verified finding set linked to the current diagnosis and classification | Only “Verified” advances; changed scope or more testing follows the controlled loop |

Every publication stores the draft revision, publisher, timestamp, reason, source references, scope version, and an immutable lifecycle event. Prior records remain available for audit rather than being overwritten.

## 6. Projection rules

- Every open RepairOrder occupies exactly one displayed pipeline stage. Later operational states take precedence over earlier planning states.
- Waiting on Parts is true when a job explicitly waits for Parts or required quantity exceeds reserved quantity.
- Needs assignment is true when a ready RepairJob has no active or staged dispatch.
- At risk is true when the target is overdue, the customer promise is within four hours, or the operating state is not active.
- Projected on time is the percentage of open orders not currently classified at risk. It is an operating projection, not a guaranteed promise.
- Estimate approval is pending when a presented estimate has no accepted or partial authorization.
- Quality-review count is based on RepairJobs ready for QC; comeback-review count uses open comeback cases.
- Customer Repair and Inventory Recon are never merged into one workload total without their origin remaining visible.

## 7. Verification evidence

- TypeScript typecheck: passed.
- Focused Shop & Recon Stage 1–7 policy, workflow, foundation, and vehicle-card tests: passed.
- Full lint: passed with zero warnings.
- Prisma schema validation: passed.
- Production build: passed; 144 routes generated, including `/vehicles/shop-production`, `/vehicles/shop-metrics`, and `/api/shop-recon`.
- Prisma migrations added for the governed lifecycle, immutable draft/event history, GM overrides, versioned scope changes, and immutable Stage 1–7 evidence publication.

## 8. Activation boundary

This repository state does not authorize production activation. The following remain pending:

- representative end-to-end Customer Repair and Inventory Recon tabletop evidence;
- real concurrent dispatch, reservation, approval, QC, close, and reopen exercises;
- role-by-role accessibility and mobile technician validation;
- production-volume performance and projection-freshness validation;
- external DMS, service, payment, messaging, accounting, supplier, and bay/tool-provider adapters;
- pilot approval, operating training, support/runbook acceptance, and monitored rollout.

Until those gates pass, provider-backed actions remain disabled and no metric may automatically trigger discipline or compensation action.
