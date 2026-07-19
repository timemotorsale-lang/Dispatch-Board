# R7 Shop & Recon Implementation

Status: bounded repository implementation complete; activation pending  
Roadmap release: R7  
Milestone: M7  
Slices: IC-070 through IC-079

## 1. Outcome

R7 provides one permission-aware Shop & Recon operating entry point at `/vehicles/shop-recon`. The earlier `/vehicles/shop-production` deep link remains compatible and renders the same authoritative landing projection. It separates Customer Repair from Inventory Recon while projecting both from the authoritative RepairOrder and RepairJob records. It does not create a second shop state model.

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

## 4. Projection rules

- Every open RepairOrder occupies exactly one displayed pipeline stage. Later operational states take precedence over earlier planning states.
- Waiting on Parts is true when a job explicitly waits for Parts or required quantity exceeds reserved quantity.
- Needs assignment is true when a ready RepairJob has no active or staged dispatch.
- At risk is true when the target is overdue, the customer promise is within four hours, or the operating state is not active.
- Projected on time is the percentage of open orders not currently classified at risk. It is an operating projection, not a guaranteed promise.
- Estimate approval is pending when a presented estimate has no accepted or partial authorization.
- Quality-review count is based on RepairJobs ready for QC; comeback-review count uses open comeback cases.
- Customer Repair and Inventory Recon are never merged into one workload total without their origin remaining visible.

## 5. Verification evidence

- TypeScript typecheck: passed.
- Focused R7 and existing Shop/Recon contract gate: 13 test files, 44 tests passed.
- Full lint: passed with zero warnings.
- Prisma schema validation: passed.
- Production build: passed; 144 routes generated, including `/vehicles/shop-production`, `/vehicles/shop-metrics`, and `/api/shop-recon`.
- No Prisma schema change or migration was required because the authoritative R7 domain records already existed.

## 6. Activation boundary

This repository state does not authorize production activation. The following remain pending:

- representative end-to-end Customer Repair and Inventory Recon tabletop evidence;
- real concurrent dispatch, reservation, approval, QC, close, and reopen exercises;
- role-by-role accessibility and mobile technician validation;
- production-volume performance and projection-freshness validation;
- external DMS, service, payment, messaging, accounting, supplier, and bay/tool-provider adapters;
- pilot approval, operating training, support/runbook acceptance, and monitored rollout.

Until those gates pass, provider-backed actions remain disabled and no metric may automatically trigger discipline or compensation action.
