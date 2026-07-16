# Quality and Safety Verification Decision and Scenario Catalog

**Status:** Proposed sixth vertical-slice catalog  
**Catalog ID:** `INV-ITF-QSV`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins when Parts and Repair Execution hands off a repair job as `READY_FOR_QC` with its effective procedure, authorization, parts/labor custody, execution evidence, restrictions, and required QC context. It ends when:

- every applicable repair job has an attributable, versioned Quality and Safety Verification result;
- the applicable template, procedure, inspector independence, safety, functional, measurement, peer, and road-test requirements are resolved truthfully;
- every failed or incomplete check creates exact rework, containment, diagnosis, or authorization work and returns through the controlled repair path;
- rework is independently reinspected without deleting or rewriting prior failure evidence;
- no percentage score, manager preference, or schedule pressure can average away a critical failure;
- the repair order receives operational release authorization only after every applicable job passes its latest QC, labor is stopped, keys/final condition are verified, and no blocking exception remains;
- the inventory unit is handed to the correct downstream owner for Title/Document Readiness, Merchandising and Pricing, or later Frontline Release Review.

This stage does not declare title ready, publish merchandising, approve pricing, set `FRONTLINE_READY`, authorize a sale, or prove customer delivery. Operational release from repair is permission to continue the governed inventory lifecycle, not final retail release.

## 2. Six distinct quality and release facts

1. **Technician completion:** The executor reports authorized work and required execution evidence complete.
2. **QC inspection performed:** An eligible inspector records results against the applicable versioned QC template.
3. **Job QC passed:** The latest QC version passes every applicable hard check, peer requirement, and road-test requirement.
4. **Rework completed:** A failed job returns through authorized repair execution and produces a new completion handoff.
5. **Repair order operationally released:** Every applicable job passes and order-level custody, condition, exception, and authorization gates pass.
6. **Downstream readiness accepted:** The next lifecycle owner accepts the handoff; title, merchandising, pricing, and frontline gates remain independent.

Technician completion is not QC. An inspection performed is not a pass. One passing check cannot offset one critical failure. A job pass is not repair-order release. Repair-order release is not frontline readiness.

## 3. Relationship to existing records

- `RepairJob` remains the authorized work unit and owns `READY_FOR_QC`, `QC_PASSED`, and rework-return projections.
- `RepairQualityInspection` remains immutable, versioned per-job QC evidence and links its superseded predecessor.
- `RepairOrderReleaseAuthorization` remains the immutable order-level operational release record.
- `RepairJobLaborClock` and labor events remain authoritative for running/paused/finished work; QC cannot fabricate stopped labor.
- `RepairJobDispatch`, effective procedure versions, technician qualifications, execution evidence, part custody, and authorization remain upstream truth.
- Enterprise commands, aggregate versions, audit, domain events, outbox, evidence, tasks, exceptions, and rollout controls remain canonical.
- Inventory lifecycle, title/document, merchandising, pricing, and frontline-readiness records remain downstream authorities and cannot be replaced by QC release.

Existing implemented foundations are inputs to this catalog. This document proposes complete staff decisions and policy; it does not claim every catalog behavior is implemented or activated.

## 4. Entry trigger catalog

| Trigger ID | Trigger | Required response |
| --- | --- | --- |
| `QSV-TRG-001` | Job transitions to `READY_FOR_QC` | Create or refresh one QC readiness item |
| `QSV-TRG-002` | Failed job returns after attributable rework completion | Create next-version reinspection item |
| `QSV-TRG-003` | Applicable QC template/procedure/safety policy changes before inspection | Re-evaluate readiness and applicability |
| `QSV-TRG-004` | New material condition, warning, recall-policy fact, damage, or evidence conflict appears | Suspend affected pass/release eligibility and investigate |
| `QSV-TRG-005` | All applicable jobs appear QC-passed | Evaluate repair-order operational release gate |
| `QSV-TRG-006` | Previously released order receives a material invalidating fact | Suspend downstream reliance and create recovery review |
| `QSV-TRG-007` | Warning, due, or overdue target is reached | Notify/escalate without changing result or clock history |

### Entry and duplicate rules

- One active QC work item exists per job, QC cycle, location, and catalog version.
- A duplicate/replayed trigger returns the existing item and cannot create a second inspection, rework loop, or release authorization.
- Out-of-order triggers reconcile against authoritative job and repair-order state.
- A superseding inspection appends a new immutable version; it does not update the prior record.
- An order-level release evaluation is repeatable, but successful authorization is created once for the exact passing inspection set.
- Provider or evidence-system outages create visible pending reconciliation; they never invent inspection, pass, or release facts.

## 5. Coordination states

```text
QC_HANDOFF_RECEIVED
  -> QC_READINESS_REVIEW
  -> AWAITING_INSPECTOR | AWAITING_RESOURCE | AWAITING_EVIDENCE
  -> INSPECTION_IN_PROGRESS
  -> AWAITING_PEER_VERIFICATION | AWAITING_ROAD_TEST
  -> QC_FAILED -> CONTAINED -> REWORK_PLANNING -> REPAIR_EXECUTION -> READY_FOR_REINSPECTION
  -> JOB_QC_PASSED
  -> ORDER_RELEASE_REVIEW
  -> RELEASE_BLOCKED | OPERATIONALLY_RELEASED
  -> DOWNSTREAM_HANDOFF_PENDING
  -> DOWNSTREAM_HANDOFF_ACCEPTED
```

These are workflow coordination states. Canonical domain statuses remain authoritative.

## 6. Decision-entry contract

Every staff decision displays:

- exact vehicle, inventory unit, repair order, job, location, custody, owner, target, and age;
- current authorization, effective procedure/QC rule snapshot, repair and QC cycle/version;
- executing technician, proposed inspector, required independence, qualifications, and conflicts;
- installed parts, labor events, measurements, execution evidence, changed scope, incidents, and open exceptions;
- applicable QC checks, tolerances, evidence, peer-verification and road-test basis;
- original and revised commitments, downstream blockers, freshness, confidence, and source authority;
- only permitted actions, expected effects, approval requirements, and non-waivable gates.

The server revalidates current state, capability, expected version, applicability, evidence integrity, separation of duties, and release gates when a command is submitted.

## 7. QC intake, applicability, and assignment

### `QSV-DEC-001` - Is the QC handoff current and complete?

Validate job status, current authorization, procedure/version, completed dispatch, stopped labor, execution evidence, installed/returned parts, measurements, incidents, restrictions, and open changed scope.

Outputs: Accept handoff; reject to execution for missing evidence; hold for reconciliation; suspend due to superseded authorization/procedure; escalate conflicting state.

### `QSV-DEC-002` - Which QC template and supplements apply?

Select by repair type, safety class, vehicle technology, installed components, procedure, policy, location, and effective time. Snapshot exact template/version and applicability reasons.

Outputs: Standard final QC; diagnostic/heavy supplement; safety-system supplement; EV/high-voltage supplement; structural/body supplement; road-test supplement; specialist verification; no eligible template.

### `QSV-DEC-003` - Is the proposed inspector eligible and sufficiently independent?

Check active status, role, training/certification, location scope, vehicle class, procedure/QC qualification, executing-technician relationship, prior involvement, and policy-required independence.

Outputs: Eligible; eligible with peer verifier; different inspector required; specialist required; manager assigns; blocked with exact missing qualification.

### `QSV-DEC-004` - Are QC bay, lift, tools, calibrated equipment, scan access, and safe area available?

Outputs: Ready; reserve resource; alternate eligible resource/location; wait with owner/ETA; block due to calibration/safety/availability.

### `QSV-DEC-005` - Is the vehicle safe to enter QC?

Evaluate containment flags, fluid/energy hazards, incomplete assembly, lift points, tire/wheel security, braking/steering restrictions, EV isolation, airbag/SRS state, and incident controls.

Outputs: Safe for full QC; stationary checks only; qualified safety review; contain and return; emergency response.

### `QSV-DEC-006` - Schedule and assign the QC cycle

Rank eligible inspector/resource windows against target, risk, job class, downstream dependency, promised dates, and fairness. Recommendations remain advisory.

### `QSV-DEC-007` - Resolve assignment or independence conflict

Conflicts include inspector as executor, insufficient peer independence, expired qualification, competing appointment/resource, location mismatch, or workload limit. Only policy-permitted conflicts can be accepted with authority and reason; required independence is non-waivable.

## 8. Inspection execution and evidence

### `QSV-DEC-010` - Inspector verifies identity, scope, and current condition

Confirm VIN/stock/job, physical location, keys, odometer where applicable, authorized correction, visible completion, custody, and pre-QC damage/condition. A mismatch blocks inspection and starts reconciliation.

### `QSV-DEC-011` - Verify repair completion against authorization and procedure

Check each applicable correction, installed part, fastener/torque or measurement requirement, fluid/material, assembly, calibration, scan/result, cleanup, labeling, and procedure evidence.

Results per check: `PASS`, `FAIL`, or `NOT_APPLICABLE_WITH_REASON`. Missing evidence is incomplete, not a pass.

### `QSV-DEC-012` - Verify safety-critical systems and condition

Safety checks include only policy/procedure-applicable items and cannot be averaged: braking, steering, wheels/tires, restraints/SRS, lighting/visibility, leaks, warning indicators, ADAS/calibration, EV/high-voltage, structural, fire/environmental, and secure assembly.

### `QSV-DEC-013` - Verify functional performance and complaint/correction outcome

Confirm the authorized concern/correction outcome through appropriate stationary, scan, measurement, operational, or controlled dynamic evidence. QC does not invent a diagnosis when the result is uncertain.

### `QSV-DEC-014` - Validate measurements, scans, calibrations, and tool provenance

Check value, unit, tolerance, equipment identifier, calibration state, capture time, vehicle/job linkage, and source integrity. Stale, copied, conflicting, or untraceable results do not satisfy the gate.

### `QSV-DEC-015` - Is peer verification required and complete?

Apply policy by repair class/risk. Record eligible peer, independence, exact checks, outcome, evidence, and time. Peer verification supplements rather than replaces the accountable QC inspector.

### `QSV-DEC-016` - Is a road test required, permitted, and feasible?

Determine applicability from procedure, correction, safety policy, symptoms, environment, registration/plate/permit, insurance, driver qualification, weather, route, fuel/charge, vehicle condition, and local rules.

Outputs: Required and eligible; required but temporarily blocked; controlled alternative evidence permitted; not required with basis; prohibited until prerequisite correction; specialist/dyno path.

### `QSV-DEC-017` - Plan the road test

Define qualified driver, approved route/environment, intended checks, minimum/maximum conditions where policy specifies, communication, emergency response, evidence, custody, start/return target, and restrictions. No arbitrary fixed distance substitutes for applicable objectives.

### `QSV-DEC-018` - Execute and record road-test outcome

Verify identity and pre-drive safety again at departure. Record actual driver, route/conditions, start/end time and mileage where appropriate, observations, warnings, measurements, evidence, incidents, and `PASSED` or `FAILED`. A required test without evidence cannot pass.

### `QSV-DEC-019` - Handle new condition or incident during QC/road test

Stop safely, protect people/property, preserve evidence, contain vehicle, create one correlated incident/condition record, notify qualified authority, and determine whether diagnosis, changed scope, rework, claim, or external response is required. Reporting does not infer blame.

## 9. Disposition and rework loop

### `QSV-DEC-020` - Evaluate the job-level QC result

Pass only when every applicable completion and safety check passes, required evidence is accepted, required peer verification passes, required road test passes, no conflicting current fact remains, and no blocking exception is open.

Outputs: `PASSED`; `FAILED_REWORK`; `INCOMPLETE`; `CONTAINED_SAFETY`; `DIAGNOSIS_REQUIRED`; `AUTHORIZATION_REQUIRED`; `SPECIALIST_REQUIRED`.

### `QSV-DEC-021` - Define exact failure and rework instructions

Each failure identifies failed check, observed versus required result, severity, evidence, containment, related repair/part/procedure, repeatability, rework objective, required qualification/resource/part, reinspection scope, owner, and target.

### `QSV-DEC-022` - Does failure require changed scope or new authorization?

Distinguish correction of authorized deficient work from newly discovered condition, collateral damage, vendor/warranty responsibility, or optional improvement. Unauthorized work cannot proceed under the original line.

### `QSV-DEC-023` - Route failed work

Options: Return to original technician if eligible; independent rework technician; diagnosis; parts replacement/warranty; sublet/specialist; safety containment; manager review; disposition/economics review. Routing must not reward concealment or bypass accountability.

### `QSV-DEC-024` - Is rework complete and eligible for reinspection?

Require current authority, completed repair procedure/evidence, stopped labor, reconciled parts/custody, resolved incidents/changed scope, and a new QC handoff. Preserve prior failed inspection.

### `QSV-DEC-025` - Determine reinspection scope

Policy may require failed items only, affected-system checks, full template repeat, peer repeat, or road-test repeat. Reuse of prior passing evidence requires explicit freshness/applicability rules and cannot reuse invalidated evidence.

### `QSV-DEC-026` - Record superseding QC result

Create the next immutable inspection version linked to its predecessor. The latest valid version controls the job projection; all prior pass/fail evidence remains reconstructable.

### `QSV-DEC-027` - Escalate repeated failure or comeback-risk pattern

Trigger technical/manager review based on repeat count, criticality, pattern, vendor/part/procedure issue, elapsed time, or policy. Do not auto-pass, hide repeats, or alter historical cycle time.

## 10. Order-level release and downstream handoff

### `QSV-DEC-030` - Have all applicable jobs passed their latest QC?

Exclude only jobs cancelled or dispositioned through explicit authority. New, reopened, changed, or superseded work invalidates the affected order-level evaluation.

### `QSV-DEC-031` - Is all work safely stopped and custody reconciled?

Require no running/paused labor, no active incompatible dispatch, keys verified, vehicle location/custodian known, loose/removed/returned parts dispositioned, tools removed, protective materials handled, and final condition evidence present.

### `QSV-DEC-032` - Are release restrictions and exceptions resolved?

Evaluate safety containment, unresolved damage, open incident, warning/recall policy, title/document restriction observed during work, missing required disclosure/follow-up, evidence conflict, external dependency, and downstream acceptance prerequisites.

Outputs: Clear; blocking exception; downstream-owned nonblocking follow-up permitted by policy; qualified risk review; non-waivable stop.

### `QSV-DEC-033` - Is the release authorizer eligible?

Check active role, location/scope, separation of duties, limit where applicable, and policy version. The person who performed repair or QC cannot self-authorize release where independence is required.

### `QSV-DEC-034` - Authorize operational release from repair

Snapshot passing QC inspection IDs, job versions, final condition, keys/custody, open-exception result, authorizer, destination, policy/catalog version, time, and reason. Authorization is immutable and idempotent.

### `QSV-DEC-035` - Select downstream route

For inventory-origin work, evaluate which controlled stages remain:

- Title/Document Readiness;
- Merchandising and Pricing preparation/review;
- Frontline Release Review only when all other independent gates are already satisfied;
- disposition/hold when retail intent or economics changed.

Parallel downstream preparation may be allowed, but operational release does not mark any downstream gate complete.

### `QSV-DEC-036` - Does the downstream owner accept the handoff?

Acceptance confirms vehicle identity/location/custody, release evidence, restrictions, open nonblocking follow-ups, next required gates, owner, and target. Rejection returns exact missing/conflicting context without cancelling the QC result.

### `QSV-DEC-037` - Handle a material fact discovered after operational release

Suspend affected downstream reliance, create recovery ownership, preserve original release evidence, determine affected jobs/checks, and route to containment, diagnosis, repair/re-QC, title, merchandising correction, or frontline-readiness suspension. Never silently edit the original release authorization.

## 11. Cancellation, correction, and degraded operation

### `QSV-DEC-040` - Cancel or defer an unstarted QC cycle

Require reason, authority, safe vehicle state, owner/target, resource release, and downstream effect. Job remains not QC-passed.

### `QSV-DEC-041` - Stop or transfer inspection in progress

Record completed/incomplete checks, evidence, vehicle condition, custody, safety, resource state, inspector, next owner, and whether partial evidence may be reused.

### `QSV-DEC-042` - Correct inspection metadata or evidence reference

Append a correction/superseding record referencing the original, authority, reason, old/new value, and affected pass/release evaluation. Direct mutation or deletion is prohibited.

### `QSV-DEC-043` - Operate during provider/evidence-system degradation

Preserve durable local work when approved, show unavailable versus stale facts, prevent unsupported pass/release, queue reconciliation, and require review before downstream reliance.

## 12. Action catalog

| Action ID | Action | Minimum output |
| --- | --- | --- |
| `QSV-ACT-001` | Accept/reject QC handoff | Exact readiness result and owner |
| `QSV-ACT-002` | Select applicable QC template | Versioned template and applicability |
| `QSV-ACT-003` | Assign inspector/resources | Eligibility and conflict result |
| `QSV-ACT-004` | Start/stop/transfer QC | Attributable custody and inspection state |
| `QSV-ACT-005` | Record completion/functional/safety check | Structured result, evidence, notes |
| `QSV-ACT-006` | Record measurement/scan/calibration | Value, tolerance, provenance, result |
| `QSV-ACT-007` | Request/record peer verification | Independent verifier and evidence |
| `QSV-ACT-008` | Determine road-test applicability | Required/not-required basis and restrictions |
| `QSV-ACT-009` | Plan/execute road test | Driver, route/conditions, outcome, evidence |
| `QSV-ACT-010` | Contain/report new condition or incident | Safe state and correlated response |
| `QSV-ACT-011` | Pass/fail/incomplete job QC | Immutable version and exact reasons |
| `QSV-ACT-012` | Create/route rework | Scope, owner, target, authority, reinspection |
| `QSV-ACT-013` | Accept rework handoff/reinspect | New cycle and supersession link |
| `QSV-ACT-014` | Evaluate order release | All-job/custody/exception gate result |
| `QSV-ACT-015` | Authorize operational release | Immutable release evidence snapshot |
| `QSV-ACT-016` | Route/accept downstream handoff | Destination, owner, target, restrictions |
| `QSV-ACT-017` | Suspend released reliance | Affected scope and recovery work |
| `QSV-ACT-018` | Correct/supersede QC evidence | Append-only correction and reevaluation |

## 13. Evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `QSV-EVD-001` | Current QC handoff snapshot | Every QC cycle | Mandatory hard gate |
| `QSV-EVD-002` | Applicable template/procedure/QC-rule snapshot | Every QC cycle | Mandatory hard gate |
| `QSV-EVD-003` | Inspector eligibility and independence | Every assignment | Mandatory hard gate |
| `QSV-EVD-004` | QC resource/calibration eligibility | Resource-dependent checks | Conditional hard gate |
| `QSV-EVD-005` | Pre-QC identity, custody, condition, and safety check | Every QC start | Mandatory hard gate |
| `QSV-EVD-006` | Completion check results | Every applicable repair | Mandatory hard gate |
| `QSV-EVD-007` | Safety check results | Every applicable repair | Mandatory hard gate |
| `QSV-EVD-008` | Functional/correction outcome | Every applicable concern/correction | Mandatory |
| `QSV-EVD-009` | Measurement/scan/calibration provenance | When procedure/template requires | Conditional hard gate |
| `QSV-EVD-010` | Peer-verification result | Policy-required repair class | Conditional hard gate |
| `QSV-EVD-011` | Road-test applicability decision | Every QC cycle | Mandatory |
| `QSV-EVD-012` | Road-test plan/eligibility | When road test required | Conditional hard gate |
| `QSV-EVD-013` | Road-test outcome/evidence | When road test required | Conditional hard gate |
| `QSV-EVD-014` | New-condition/incident evidence | When observed | Mandatory exception evidence |
| `QSV-EVD-015` | Immutable QC disposition/version | Every completed inspection | Mandatory |
| `QSV-EVD-016` | Failure/rework instructions and containment | Every failed QC | Mandatory hard gate |
| `QSV-EVD-017` | Rework completion and reinspection lineage | Every rework cycle | Mandatory |
| `QSV-EVD-018` | Final condition, keys, location, and custody | Every order release | Mandatory hard gate |
| `QSV-EVD-019` | All-job latest-pass and stopped-labor snapshot | Every order release | Mandatory hard gate |
| `QSV-EVD-020` | Open-exception/restriction evaluation | Every order release | Mandatory hard gate |
| `QSV-EVD-021` | Operational release authorization | Every successful order release | Mandatory |
| `QSV-EVD-022` | Downstream handoff/acceptance | Every released inventory order | Mandatory |
| `QSV-EVD-023` | Post-release invalidation/recovery evidence | When material new fact appears | Mandatory exception evidence |
| `QSV-EVD-024` | Correction/supersession/reconciliation evidence | When fact changes or system recovers | Mandatory |

## 14. Exception reason catalog

| Reason code | Meaning | Control effect |
| --- | --- | --- |
| `QSV_EX_HANDOFF_INCOMPLETE` | Required execution/QC context absent | Intake blocked |
| `QSV_EX_STATE_CONFLICT` | Job/order facts conflict or are stale | Reconciliation required |
| `QSV_EX_TEMPLATE_UNAVAILABLE` | No effective applicable QC template | Inspection blocked |
| `QSV_EX_INSPECTOR_INELIGIBLE` | Qualification/scope is insufficient | Assignment/start blocked |
| `QSV_EX_INDEPENDENCE_REQUIRED` | Inspector/peer separation fails | Non-waivable assignment block |
| `QSV_EX_RESOURCE_UNAVAILABLE` | Eligible bay/tool/equipment unavailable | Wait/reassign |
| `QSV_EX_CALIBRATION_INVALID` | Measurement equipment not eligible | Affected evidence rejected |
| `QSV_EX_PRE_QC_UNSAFE` | Vehicle cannot safely enter full QC | Contain/restrict |
| `QSV_EX_IDENTITY_MISMATCH` | Physical unit and job differ | Stop and reconcile |
| `QSV_EX_COMPLETION_CHECK_FAILED` | Authorized correction not verified | QC fail/rework |
| `QSV_EX_SAFETY_CHECK_FAILED` | Applicable critical safety check fails | Contain; QC fail |
| `QSV_EX_EVIDENCE_MISSING_REJECTED` | Required evidence absent/invalid | Pass blocked |
| `QSV_EX_MEASUREMENT_OUT_OF_TOLERANCE` | Required measurement fails | QC fail/rework |
| `QSV_EX_PEER_VERIFICATION_FAILED` | Required peer check absent/failed | Pass blocked |
| `QSV_EX_ROAD_TEST_REQUIRED_BLOCKED` | Required test cannot safely/legally occur | Pass pending |
| `QSV_EX_ROAD_TEST_FAILED` | Required dynamic result fails | QC fail/rework |
| `QSV_EX_NEW_CONDITION` | New defect/damage/warning observed | Diagnose/reapprove/rework |
| `QSV_EX_QC_INCIDENT` | Safety/security/environmental event | Stop/contain/escalate |
| `QSV_EX_CHANGED_SCOPE_AUTHORITY` | Failure needs work outside authority | Reapproval required |
| `QSV_EX_REPEAT_FAILURE` | Rework fails again/pattern detected | Technical/manager escalation |
| `QSV_EX_ACTIVE_LABOR` | Labor still running/paused | Order release blocked |
| `QSV_EX_JOB_NOT_LATEST_PASS` | Applicable job lacks current pass | Order release blocked |
| `QSV_EX_KEYS_CUSTODY_UNVERIFIED` | Keys/location/custody incomplete | Order release blocked |
| `QSV_EX_OPEN_RELEASE_RESTRICTION` | Blocking exception/restriction remains | Order release blocked |
| `QSV_EX_RELEASE_AUTHORITY` | Authorizer lacks authority/independence | Authorization blocked |
| `QSV_EX_DOWNSTREAM_REJECTED` | Next owner cannot accept context/custody | Handoff remains owned |
| `QSV_EX_POST_RELEASE_INVALIDATION` | New fact undermines released evidence | Suspend reliance/recover |
| `QSV_EX_PROVIDER_UNAVAILABLE` | External/evidence service unavailable | Degraded reconciliation |
| `QSV_EX_UNAUTHORIZED_COMMAND` | Actor lacks capability | Server denial |
| `QSV_EX_TARGET_MISSED` | QC/rework/release target exceeded | Escalate; no automatic result |

## 15. Scenario catalog

| Scenario ID | Scenario | Expected outcome |
| --- | --- | --- |
| `QSV-SCN-001` | Normal light repair with complete handoff | Eligible inspection passes and proceeds to order gate |
| `QSV-SCN-002` | Handoff lacks technician completion evidence | Reject to execution; do not start QC |
| `QSV-SCN-003` | Job status and handoff conflict | Reconcile authoritative state; no duplicate cycle |
| `QSV-SCN-004` | Applicable QC template missing/expired | Block and route template/procedure authority |
| `QSV-SCN-005` | Multiple supplements apply | Snapshot coherent combined requirements without hiding any hard check |
| `QSV-SCN-006` | Proposed inspector performed the repair | Apply independence policy; assign alternate where required |
| `QSV-SCN-007` | Inspector qualification expired | Server denies assignment/start |
| `QSV-SCN-008` | Heavy repair needs independent peer | Eligible different peer and attributable result required |
| `QSV-SCN-009` | Calibrated scan/tool unavailable | Wait or alternate eligible resource; no fabricated result |
| `QSV-SCN-010` | Vehicle unsafe to lift or drive | Stationary/containment route; prohibited activity blocked |
| `QSV-SCN-011` | Wrong vehicle/job presented | Stop and reconcile identity/custody |
| `QSV-SCN-012` | Authorized correction visibly incomplete | Fail exact completion check and route rework |
| `QSV-SCN-013` | Missing fastener/torque/measurement evidence | Incomplete/fail per policy; cannot infer pass |
| `QSV-SCN-014` | Safety check fails while functional check passes | Job fails; critical result cannot be averaged away |
| `QSV-SCN-015` | Functional symptom remains intermittent | Do not invent pass/diagnosis; owned diagnostic path |
| `QSV-SCN-016` | Measurement is out of tolerance | Fail with value/unit/tolerance/provenance |
| `QSV-SCN-017` | Measurement copied from another vehicle | Reject evidence and investigate integrity |
| `QSV-SCN-018` | Peer verifier is executing technician | Independence gate blocks peer pass |
| `QSV-SCN-019` | Peer verification fails | Job fails with exact rework/diagnosis instruction |
| `QSV-SCN-020` | Road test not applicable | Record policy basis; no arbitrary drive required |
| `QSV-SCN-021` | Road test required and passes | Qualified execution and evidence satisfy dynamic gate |
| `QSV-SCN-022` | Road test required but weather/route unsafe | Wait/alternative only if policy permits; no pass |
| `QSV-SCN-023` | Road-test driver not eligible | Server denies departure/start |
| `QSV-SCN-024` | Warning/symptom appears during road test | Stop safely, preserve evidence, fail/diagnose |
| `QSV-SCN-025` | Collision/incident during road test | Emergency/incident/custody response; no blame inference |
| `QSV-SCN-026` | All applicable checks pass | Immutable `PASSED` version and `QC_PASSED` projection |
| `QSV-SCN-027` | One noncritical applicable check fails | Job fails unless policy explicitly classifies it non-gating downstream work |
| `QSV-SCN-028` | Required evidence upload fails | Preserve draft/local work; inspection cannot pass yet |
| `QSV-SCN-029` | QC fails due to deficient authorized work | Exact rework returns through repair execution |
| `QSV-SCN-030` | QC discovers new unauthorized condition | Diagnose/estimate/reapprove before new work |
| `QSV-SCN-031` | Failed part is under vendor warranty | Preserve failure; controlled parts/warranty/rework path |
| `QSV-SCN-032` | Rework completed and returned | New reinspection cycle links prior failure |
| `QSV-SCN-033` | Reinspection passes affected checks | Latest pass controls projection; prior failure remains |
| `QSV-SCN-034` | Reinspection fails same issue again | Repeat-failure escalation; no automatic third pass |
| `QSV-SCN-035` | Rework changed adjacent safety system | Expand reinspection scope per impact policy |
| `QSV-SCN-036` | Prior passing evidence is now stale/invalidated | Repeat affected/full checks; do not reuse silently |
| `QSV-SCN-037` | One of several repair jobs has not passed | Repair-order release blocked with exact job |
| `QSV-SCN-038` | All jobs pass but labor remains paused | Repair-order release blocked until safe closure |
| `QSV-SCN-039` | Keys or final location not verified | Repair-order release blocked and custody work created |
| `QSV-SCN-040` | Open critical safety exception remains | Non-waivable release block |
| `QSV-SCN-041` | Title concern observed during QC | Create title restriction/follow-up; QC does not decide title status |
| `QSV-SCN-042` | All order release gates pass | Immutable operational release to correct inventory route |
| `QSV-SCN-043` | Unauthorized user attempts pass/release | Server denial and protected evidence |
| `QSV-SCN-044` | Downstream owner rejects incomplete handoff | QC/release history remains; exact handoff gap stays owned |
| `QSV-SCN-045` | Material defect discovered after release | Suspend affected reliance and route containment/re-QC |
| `QSV-SCN-046` | Duplicate inspection/release command replay | Same result; no duplicate version/authorization |
| `QSV-SCN-047` | Concurrent pass/fail or release command | One expected-version transition; recoverable current state |
| `QSV-SCN-048` | Evidence/provider system unavailable | Visible staleness and reconciliation; no invented pass/release |
| `QSV-SCN-049` | Inspection metadata/evidence reference is wrong | Append correction/supersession and reevaluate affected gates |
| `QSV-SCN-050` | QC/rework/release misses target | Owned escalation and revised forecast; no auto-pass or clock reset |

## 16. Catalog exit gate

This catalog is ready for code only when:

- policy owners approve the six completion/inspection/pass/rework/release/downstream distinctions;
- QC template families, applicability, versioning, procedure linkage, checks, tolerances, evidence, and publisher authority are approved;
- inspector/peer roles, qualifications, independence, location scope, workload, assignment, and conflict policies are approved;
- QC resource, equipment calibration, vehicle-entry safety, EV/high-voltage, lift, scan, functional, and measurement rules are approved by qualified authority;
- road-test applicability, legal/safety eligibility, route, driver, weather, evidence, alternative method, incident, and stop rules are approved;
- failure severity, containment, diagnosis, changed scope, authorization, rework routing, reinspection scope, repeat failure, and correction rules are approved;
- job pass, all-job order release, stopped labor, keys/custody, final condition, exception, authorizer, and downstream handoff gates are approved;
- staff walk through at least twenty representative cases spanning critical failure, intermittent symptom, evidence integrity, peer independence, unsafe road test, rework, repeated failure, order release, downstream rejection, and post-release invalidation;
- acceptance scenarios map to planned automated/manual evidence;
- no workflow behavior is activated merely because this planning catalog exists.
