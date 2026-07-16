# Parts and Repair Execution Decision and Scenario Catalog

**Status:** Proposed fifth vertical-slice catalog  
**Catalog ID:** `INV-ITF-PRE`  
**Version:** `0.1.0`  
**Activation:** Not approved; documentation only

## 1. Outcome and boundary

This catalog begins when Recon Planning and Approval produces current authorized repair jobs or an approved diagnosis/specialist task with defined requirements. It ends when:

- every job’s authorization, procedure, dependencies, skills, certifications, bay, tools, parts, safety, location, and evidence prerequisites are truthfully evaluated;
- parts demand is sourced, purchased where authorized, received, inspected, reconciled, reserved, issued, installed, returned, or otherwise dispositioned with immutable custody;
- only eligible jobs are dispatched to eligible technicians/resources at feasible times;
- labor start, pause, resume, correction, transfer, and finish events are attributable and do not fabricate productivity;
- work follows the effective procedure and captures required execution evidence;
- unexpected findings, changed scope, safety conditions, unavailable parts/resources, rework, and external/sublet work use controlled recovery;
- no work beyond current authorization is performed or concealed;
- every completed job has exact completion evidence, parts/labor custody, open-exception status, and QC handoff;
- the repair order is routed to Quality and Safety Verification only when all applicable jobs are completed or safely dispositioned.

This stage does not pass QC, authorize frontline release, post general-ledger transactions, or declare the vehicle safe, title-ready, market-ready, or frontline-ready.

## 2. Six distinct parts and execution facts

The workflow must keep these separate:

1. **Demand defined:** The authorized job requires a specific part/material and quantity.
2. **Sourced/ordered:** An approved source or purchase order exists.
3. **Received and usable:** The correct quantity/condition/fitment has been accepted into stock.
4. **Reserved:** Usable stock is allocated to the exact demand/job.
5. **Issued/installed:** Custody moved to the job and installation/use is evidenced.
6. **Job completed for QC:** Authorized procedure work and evidence are finished and ready for independent verification.

A quote is not stock. An order acknowledgement is not receipt. On-hand is not available. Reserved is not issued. Issued is not installed. Technician finish is not a QC pass.

## 3. Relationship to existing records

- `RepairJob` remains the authorized work unit and links the exact estimate line, authorization, diagnosis, requirements, procedure, status, parts demand, dispatch, labor, evidence, and QC.
- `RepairPartDemand` defines quantity and time need; `PartReservation` allocates exact usable stock.
- `PartStockLedgerEntry` and `PartStockBalance` remain immutable movement facts and rebuildable quantity projections.
- `PartRequisition`, `PartVendorOffer`, `PartPurchaseOrder`, `PartReceipt`, and `PartReceivingDiscrepancy` govern sourcing, purchasing, receiving, and discrepancies.
- `PartCustodyEvent` governs issue, installation, unused return, and related custody.
- `RepairJobDispatch` links eligible technician, bay/resources, position, schedule, conflicts, override, and supersession.
- `RepairJobLaborClock` and `RepairJobLaborEvent` govern attributable execution time and corrections.
- `WorkProcedureVersion`, knowledge links, technician qualifications, and schedulable resources govern execution eligibility.
- `RepairQualityInspection` remains downstream QC authority and cannot be replaced by execution completion.

The workflow coordinates these domains; it must not create shadow stock counts, parts orders, labor records, or work instructions.

## 4. Entry trigger catalog

| Trigger ID | Claimed event | Required correlation | Initial response |
| --- | --- | --- | --- |
| `PRE-TRG-001` | Authorized plan handoff | Current jobs, estimate/authorization versions, requirements, restrictions, owner | Evaluate execution readiness |
| `PRE-TRG-002` | Parts demand/reservation becomes ready | Demand/job/part/location, quantity, ledger/reservation version | Re-evaluate affected job |
| `PRE-TRG-003` | Purchase/shipment/receipt changes | PO/receipt/discrepancy, demand/job, source/freshness | Reconcile usability and ETA |
| `PRE-TRG-004` | Technician/resource becomes available | Eligibility, location, availability window, conflicts | Recompute feasible dispatch |
| `PRE-TRG-005` | Execution reveals new condition/scope | Job, observation/evidence, time, technician | Contain and route changed-scope decision |
| `PRE-TRG-006` | Job authorization/procedure/qualification changes | Exact affected version/record | Suspend affected readiness/execution safely |
| `PRE-TRG-007` | Existing execution recovery/backfill | Canonical order/job, historical evidence, reason, recovery authority | Create labeled recovery state |

### Entry and duplicate rules

| Rule ID | Condition | Required result |
| --- | --- | --- |
| `PRE-RULE-001` | Job lacks current accepted authorization | Block dispatch/start |
| `PRE-RULE-002` | Same command/idempotency key repeats | Return existing result; no duplicate stock/labor/custody/event |
| `PRE-RULE-003` | Authorization is expired/revoked or scope changed | Suspend affected job and reconcile commitments/work |
| `PRE-RULE-004` | Required part is not fully reserved and usable | Job cannot be ready unless approved procedure explicitly supports a safe parts-independent phase |
| `PRE-RULE-005` | Procedure, skill, certification, bay, tool, or safety prerequisite is missing | Create resolution work; do not dispatch |
| `PRE-RULE-006` | Vehicle/job/location/custody conflicts | Stop normal execution and reconcile |
| `PRE-RULE-007` | Job already active/completed/cancelled | Reject incompatible repeated transition or route correction/rework |

## 5. Coordination states

```text
AUTHORIZED_PLAN_RECEIVED
  -> PARTS_AND_RESOURCE_READINESS
  -> READY_FOR_DISPATCH
  -> DISPATCHED_OR_STAGED
  -> EXECUTION_STARTED
  -> IN_PROGRESS
  -> EXECUTION_EVIDENCE_REVIEW
  -> READY_FOR_QC
  -> QC_HANDOFF

Alternate:
  -> WAITING_PARTS
  -> WAITING_RESOURCE_OR_PROCEDURE
  -> WAITING_EXTERNAL_SUBLET
  -> PAUSED_BLOCKED
  -> CHANGED_SCOPE_REAPPROVAL
  -> SAFETY_CONTAINMENT
  -> REASSIGN_OR_RESCHEDULE
  -> CANCELLED_OR_RECOVERY
```

## 6. Decision-entry contract

Before any parts or execution decision, show:

- vehicle/unit/order/job and current authorized amount/scope/version;
- source findings, diagnosis, procedure, safety restrictions, and QC/evidence requirements;
- job state, target, priority reasons, dependencies, and accountable owner;
- parts demand, stock, reservation, order, shipment, receipt, discrepancy, custody, and freshness;
- technician qualification, schedule, bay/tool/resource eligibility and conflicts;
- active labor clocks, prior work/evidence, changed conditions, and open exceptions;
- what the response will purchase, allocate, move, start, pause, finish, block, or hand off.

Staff must be able to report wrong parts, wrong scope, unsafe conditions, or stale information without accepting it.

## 7. Parts demand, sourcing, and purchase decisions

### `PRE-DEC-001` — Is the authorized execution handoff current and complete?

Responses: Current; current with owned waiting prerequisites; stale/superseded; authorization changed; wrong job/order/vehicle; conflicting; incomplete requirements.

### `PRE-DEC-002` — Does each parts-required job have complete demand?

Verify exact part/specification, quantity, unit, fitment, source job, required-at time, substitution policy, location, notes, and version. Missing demand blocks readiness; duplicate demand is correlated rather than recreated.

### `PRE-DEC-003` — Is usable stock actually available?

Evaluate active part, correct location, on-hand, allocated, damaged, available, count/freeze state, last movement/freshness, lot/serial/core constraints where applicable, and active competing reservations.

Outputs: Sufficient available; partially available; on hand but allocated; on hand but damaged/quarantined; wrong location; count/conflict review; unavailable; unknown/stale.

### `PRE-DEC-004` — Can an approved substitute/interchange be used?

Require approved relationship, fitment evidence, quality/type, warranty/return implications, procedure/authorization compatibility, cost/schedule impact, and exact authority. A same-looking or vendor-suggested part is not automatically eligible.

### `PRE-DEC-005` — Select sourcing path

Eligible paths:

- reserve approved local stock;
- approved inter-location transfer;
- approved vendor offer/requisition;
- approved OEM/aftermarket/remanufactured/used option per policy;
- specialist/sublet supplied material;
- backorder/alternate-source review;
- scope/vehicle disposition review;
- information/fitment resolution.

Recommendations disclose price, availability/ETA, source freshness, warranty, return/core terms, reliability facts, transport, uncertainty, and required authority.

### `PRE-DEC-006` — Is purchasing authorized?

Evaluate exact requisition/PO lines, quantity, unit cost, fees/freight, currency, vendor, cumulative exposure, current recon authorization, related requests, quote validity, terms, return/core/warranty, and delegated limit.

No purchase order may expand repair authorization silently. Emergency safety/custody authority is separate and narrow.

### `PRE-DEC-007` — Issue and acknowledge purchase order

Required: approved vendor, location, requisition/demand lineage, stable line keys, price/quantity, expected arrival, terms, approver, reason, and external/local references. Draft, approved, issued, acknowledged, changed, partially received, fully received, cancelled, and closed remain distinct.

### `PRE-DEC-008` — Monitor shipment and ETA

Responses: Acknowledged/on time; partial shipment; delayed with revised ETA; delayed without ETA; backordered; cancelled; lost/damaged; wrong shipment; status unknown/provider unavailable.

Revised ETA never erases original commitment or delay history. Every external dependency retains an internal owner and next follow-up.

## 8. Parts receipt, reservation, and custody

### `PRE-DEC-010` — Did the expected part/material arrive?

Capture packing/source reference, PO/line, part, quantity, received time/person/location, invoice reference, condition, cost, and evidence.

Outcomes: Complete correct receipt; partial; over; short; damaged; wrong part; cost variance; no PO/unexpected; disputed; unable to verify.

### `PRE-DEC-011` — Is the received part usable for this job?

Verify identity, fitment, quantity, condition, specification, lot/serial/expiry where relevant, warranty/return/core terms, contamination/damage, and procedure/authorization compatibility.

Received-but-unusable stock cannot satisfy demand or readiness.

### `PRE-DEC-012` — Resolve receiving discrepancy

Options: Accept verified correction; quarantine/damaged stock; request replacement; partial accept/backorder remainder; return to vendor; cost approval/reconciliation; update approved interchange; reject receipt; manager/vendor review. Resolution retains expected/received facts and authority.

### `PRE-DEC-013` — Reserve usable stock to demand

Require active demand, same part/approved substitute, eligible location, available quantity, remaining demand, version, actor, reason, and correlation. Concurrent reservation cannot overallocate or make stock negative.

### `PRE-DEC-014` — Release or replace reservation

Reasons: scope/authorization changed, job cancelled, substitute selected, damaged/lost stock, transfer, quantity correction, or manager reallocation. Release writes ledger/custody facts and re-evaluates readiness; it never deletes reservation history.

### `PRE-DEC-015` — Issue part to technician/job

Require exact active reservation/demand/job, quantity, source stock location, receiving technician/job custody, procedure readiness, actor/time, and evidence. Issued quantity cannot exceed usable reserved quantity.

### `PRE-DEC-016` — Record installation/use, unused return, core, warranty, or vendor return

Each movement retains part/job/source, quantity, unit cost classification, from/to custody, evidence, reason, actor/time, and correlation. Installation requires the authorized job and procedure evidence; unused return requires reconcilable custody and eligible stock condition.

## 9. Execution readiness and dispatch

### `PRE-DEC-020` — Is the effective procedure available for the scheduled window?

Check active version, applicability, instructions, safety steps, required evidence, QC rules, standard-duration source, supplements, knowledge references, and effective dates. Retired/expired/reference-only material cannot silently govern execution.

### `PRE-DEC-021` — Is the technician eligible?

Evaluate active employment/resource, organization/location, required skills/certifications and effective dates, procedure/safety scope, workload/availability, restrictions, and conflict/separation rules. Job title alone does not prove eligibility.

### `PRE-DEC-022` — Are bay, tools, equipment, and vehicle location eligible?

Verify active same-location resources, compatibility, capacity, calibration/status, time-window availability, EV/high-voltage controls, movement/custody, and appointment/shop conflicts.

### `PRE-DEC-023` — Are parts ready for the executable phase?

Outputs: No parts required; every required quantity usable and reserved; partial readiness; ordered/not received; received not reserved; reserved damaged/released; substitute pending; readiness data stale/conflicting.

### `PRE-DEC-024` — Are predecessor and external dependencies satisfied?

Every predecessor, diagnosis, title/disposition restriction, sublet, safety containment, movement, authorization, and evidence dependency must have a verified state. A comment cannot satisfy a dependency.

### `PRE-DEC-025` — Is the job ready for dispatch?

Gate requires current authorization, effective procedure, eligible technician candidates, resources, parts readiness, dependencies, location/custody, safety, duration range, evidence/QC requirements, and no conflicting active dispatch.

### `PRE-DEC-026` — Select assignment, lane, position, and schedule

Eligible options only. Recommendation may consider safety, lifecycle delay, downstream unlock, parts readiness, duration/critical ratio, skill/bay fit, continuity, commitments, and excessive context switching. `CURRENT` and `NEXT` capacity rules prevent invisible overloading; priority is not an employee quota.

### `PRE-DEC-027` — Review dispatch conflicts or override

Conflicts include technician/bay/tool overlap, appointment reservations, location, qualification, labor clock, parts, vehicle movement, or queue-position conflict. Only explicitly overrideable conflicts may proceed with authority, reason, scope, expiry, and visible residual risk. Hard eligibility cannot be overridden.

## 10. Execution start and procedure

### `PRE-DEC-030` — Technician accepts and verifies the job

Show exact vehicle/job, authorized correction, procedure/version, safety steps, parts/custody, bay/tools, dependencies, evidence/QC requirements, estimate duration, and restrictions.

Responses: Accept/start-ready; information conflict; wrong vehicle/job; part/tool/resource missing; unsafe condition; authorization/scope unclear; needs manager/diagnosis review.

### `PRE-DEC-031` — Perform pre-work safety and setup check

Verify vehicle secured/lift points, power isolation where required, PPE, tools/calibration, part identity, work area, procedure prerequisites, and safe-stop/incident path. Failure blocks labor start or moves to containment.

### `PRE-DEC-032` — Start labor/execution

Only the active current dispatch, eligible technician, ready job, and satisfied pre-work gate may start. One technician cannot have multiple running clocks. Start records exact time, actor, job/procedure/version, vehicle/location, and idempotency key.

### `PRE-DEC-033` — Follow procedure and capture step evidence

Required safety steps, instructions, measurements, torque/specification, tests, part/serial/lot evidence, images, notes, and deviations are captured as configured. Reference material may assist but cannot silently replace the approved procedure.

### `PRE-DEC-034` — Pause or block work

Reasons:

- waiting for part/tool/bay;
- new finding or diagnosis;
- authorization/scope question;
- safety/incident condition;
- procedure/technical assistance;
- sublet/vendor;
- vehicle moved/unavailable;
- end of shift/technician unavailable;
- system/evidence failure;
- other controlled reason.

Pause records safe condition, accumulated time, blocker, owner, next action, review/ETA, vehicle/parts/tool custody, and whether revalidation is required. Pausing does not reset age.

### `PRE-DEC-035` — Resume work

Revalidate authorization, procedure, technician, resources, parts, vehicle condition/location, resolved blocker, evidence, and changed conditions. Resume cannot proceed merely because time passed.

## 11. Changed scope, incidents, and external work

### `PRE-DEC-040` — Record an unexpected finding or changed condition

Preserve observation/evidence, immediate restriction, relationship to current scope, diagnostic need, cost/time/parts impact, and current safe state.

Options: Continue authorized unaffected work; pause affected work; request diagnosis; request changed-scope estimate/authorization; safety containment; specialist/sublet; disposition review.

No incremental correction is performed before exact authority unless narrow emergency containment policy applies.

### `PRE-DEC-041` — Handle incorrect, damaged, missing, or failed part during execution

Stop affected work safely; preserve part/job custody; classify wrong/defective/damaged/fitment/quantity/failure; create replacement/substitute/return/warranty/core/discrepancy path; re-evaluate schedule, authorization, and readiness.

### `PRE-DEC-042` — Execute sublet/specialist work

Maintain internal owner, exact authorized scope, vendor eligibility, transport/custody, schedule, evidence/procedure expectations, quote/authorization, status follow-up, return condition, and acceptance/QC handoff. Vendor completion is not automatically dealership QC acceptance.

### `PRE-DEC-043` — Report safety, quality, security, or environmental incident

Provide immediate approved containment/emergency options, preserve evidence, restrict visibility where required, stop affected work/resources, create one correlated incident/exception, and notify actionable authority. Reporting does not imply fault or disciplinary conclusion.

### `PRE-DEC-044` — Transfer or reassign active work

Require safe stopping point, labor/parts/tool/vehicle custody, completed/open procedure steps, evidence, restrictions, receiving technician eligibility, schedule/resources, reason, authority, and new dispatch/version. Reassignment cannot hide delay or restart work clocks.

## 12. Labor and completion evidence

### `PRE-DEC-050` — Record labor pause/resume/finish/correction

Events are append-only and attributable. Correction requires existing clock, exact minutes, reason, authority, and audit. Corrections cannot make accumulated time negative or rewrite original events. Approved nonproductive codes are operational facts, not automatic employee evaluation.

### `PRE-DEC-051` — Is authorized work actually complete?

Evaluate every authorized procedure step, installed/used parts and custody, required measurements/tests, execution media, unresolved changed scope, safety restrictions, labor events, completion notes, and QC prerequisites.

Outputs: Complete for QC; incomplete; blocked; additional authorization required; rework before QC; evidence rejected/missing; conflicting latest state.

### `PRE-DEC-052` — Finish job and create QC handoff

Required:

- exact completed authorized correction;
- execution evidence and procedure version;
- installed/returned part custody and exceptions;
- labor completion and corrections;
- required measurements/tests/results;
- open restrictions/findings/dependencies;
- QC template/rules, peer verification, road-test requirements;
- technician notes and attributable completion time.

Finish changes the job to `READY_FOR_QC`; it does not pass QC.

### `PRE-DEC-053` — Is Parts and Repair Execution complete for the repair order?

Gate requires:

- every applicable authorized job is `READY_FOR_QC`, completed/accepted downstream, or safely cancelled/replanned with authority;
- no unauthorized, expired, revoked, or changed scope was executed;
- parts demand, reservations, issues, installations, unused returns, cores/warranty/returns, receipts, and discrepancies reconcile;
- labor clocks/events and corrections reconcile;
- procedures, safety steps, execution evidence, and job requirements are complete;
- paused/in-progress dispatches and running clocks are absent for jobs handed to QC;
- every changed condition/incident/open exception has owner and gate effect;
- events, audit, custody, readiness, and QC handoffs commit consistently.

Gate outputs:

- `PASS_TO_QUALITY_AND_SAFETY_VERIFICATION`;
- `PASS_PARTIAL_JOBS_TO_QC_WITH_REMAINING_OWNED_WORK`;
- `FAIL_AUTHORIZATION_OR_SCOPE`;
- `FAIL_PARTS_CUSTODY_OR_RECONCILIATION`;
- `FAIL_PROCEDURE_OR_EXECUTION_EVIDENCE`;
- `FAIL_ACTIVE_LABOR_OR_DISPATCH`;
- `FAIL_CHANGED_SCOPE_OR_INCIDENT`;
- `FAIL_UNOWNED_BLOCKER`;
- `FAIL_DATA_CONFLICT`;
- `FAIL_PERMISSION_OR_CONCURRENCY`.

## 13. Cancellation and recovery

### `PRE-DEC-060` — Cancel an unstarted job

Verify authority, authorization relationship, dependencies, reservations/orders, schedule/resources, downstream gate impact, and reason. Release/recover reservations and commitments through explicit commands; never delete history.

### `PRE-DEC-061` — Stop/cancel work already started

Classify safe stoppability, completed partial work, labor, installed/issued parts, vehicle condition, evidence, commitments, reassembly/containment need, revised estimate/authorization, and QC/reinspection requirements.

### `PRE-DEC-062` — Correct stock, custody, labor, dispatch, or execution evidence

Corrections reference the original fact, preserve prior value/event, require authority/reason/evidence, create reversal/supersession, and re-evaluate affected readiness/cost/QC. Direct editing of ledger movements, installed parts, labor events, or completed procedure evidence is prohibited.

## 14. Action catalog

| Action ID | Action | Completion evidence |
| --- | --- | --- |
| `PRE-ACT-001` | Validate execution handoff/job | Current authorization, procedure, requirements, dependencies |
| `PRE-ACT-002` | Create/reconcile parts demand | Exact part/spec/quantity/job/time/substitution |
| `PRE-ACT-003` | Source/compare part offers | Eligible sources, price/ETA/terms/freshness |
| `PRE-ACT-004` | Authorize/issue purchase order | Exact lines, authority, vendor, terms, correlation |
| `PRE-ACT-005` | Monitor shipment/backorder | Original/revised ETA, status, owner, recovery |
| `PRE-ACT-006` | Receive/inspect parts | PO/source, quantity, condition, cost, stock location |
| `PRE-ACT-007` | Resolve receipt discrepancy | Expected/received facts and authorized disposition |
| `PRE-ACT-008` | Reserve/release stock | Demand/quantity/location/ledger and readiness result |
| `PRE-ACT-009` | Issue/install/return part custody | Exact job/part/quantity/from/to/evidence/time |
| `PRE-ACT-010` | Evaluate job readiness | Exact eligibility and missing-prerequisite reasons |
| `PRE-ACT-011` | Dispatch/reassign job | Eligible technician/resources/window/conflicts/version |
| `PRE-ACT-012` | Start/pause/resume/correct labor | Append-only event and reconciled clock |
| `PRE-ACT-013` | Record procedure execution evidence | Step/measurement/test/part/evidence/actor/time |
| `PRE-ACT-014` | Route changed scope/incident | Containment, diagnosis/reapproval/recovery owner |
| `PRE-ACT-015` | Finish job | Complete authorized work/evidence and labor/parts custody |
| `PRE-ACT-016` | Create QC handoff | Procedure/evidence/parts/labor/restrictions/QC rules |
| `PRE-ACT-017` | Cancel/recover/correct execution | Authority, reversals/supersession, downstream impact |

## 15. Evidence catalog

| Evidence ID | Evidence | Required when | Proposed criticality |
| --- | --- | --- | --- |
| `PRE-EVD-001` | Authorized-plan/job handoff | Every execution job | Mandatory hard gate |
| `PRE-EVD-002` | Parts demand/specification/fitment | Parts-required job | Mandatory |
| `PRE-EVD-003` | Offer/quote/PO authority and terms | Purchased part/material | Mandatory financial gate |
| `PRE-EVD-004` | Shipment/ETA/status lineage | Ordered external part | Mandatory operational evidence |
| `PRE-EVD-005` | Receipt/condition/cost/source | Every received part | Mandatory ledger/custody evidence |
| `PRE-EVD-006` | Receiving discrepancy resolution | Any nonmatching receipt | Mandatory before usable disposition |
| `PRE-EVD-007` | Reservation/release ledger | Every allocated demand | Mandatory |
| `PRE-EVD-008` | Issue/install/unused/core/warranty/return custody | Every physical part movement | Mandatory immutable evidence |
| `PRE-EVD-009` | Effective procedure/safety/QC snapshot | Every dispatched job | Mandatory hard gate |
| `PRE-EVD-010` | Technician qualification | Every dispatch/execution | Mandatory hard gate |
| `PRE-EVD-011` | Resource/location/conflict snapshot | Every dispatch/reassignment | Mandatory |
| `PRE-EVD-012` | Pre-work safety/setup gate | Every job start | Mandatory hard gate |
| `PRE-EVD-013` | Labor event/clock/correction | Every execution period | Mandatory |
| `PRE-EVD-014` | Procedure step/measurement/test evidence | Template-designated work | Mandatory where applicable |
| `PRE-EVD-015` | Pause/blocker safe-state handoff | Every pause/transfer | Mandatory |
| `PRE-EVD-016` | Changed-scope/incident evidence | Any unexpected condition | Mandatory hard/reapproval gate |
| `PRE-EVD-017` | Job completion evidence | Every finish | Mandatory |
| `PRE-EVD-018` | QC handoff snapshot | Every finished job | Mandatory |
| `PRE-EVD-019` | Execution completion gate | Every order/stage handoff | Mandatory immutable output |
| `PRE-EVD-020` | Cancellation/correction/recovery lineage | Any reversal/supersession | Mandatory |

## 16. Exception reason catalog

| Reason code | Meaning | Default control class |
| --- | --- | --- |
| `PRE_EX_HANDOFF_OR_AUTHORIZATION_INVALID` | Job lacks current executable authority | Authorization hard gate |
| `PRE_EX_PART_DEMAND_MISSING` | Required demand is absent/incomplete | Parts/readiness gate |
| `PRE_EX_PART_FITMENT_UNKNOWN` | Part/spec/substitute eligibility is unresolved | Safety/quality gate |
| `PRE_EX_PARTS_NOT_AVAILABLE` | Usable stock is insufficient | Parts waiting |
| `PRE_EX_PARTS_NOT_RESERVED` | Stock exists but is not allocated to demand | Parts/readiness gate |
| `PRE_EX_PART_DAMAGED_OR_QUARANTINED` | Received/on-hand part is unusable | Quality/custody gate |
| `PRE_EX_PURCHASE_AUTHORITY_REQUIRED` | PO/changed cost exceeds authority/scope | Financial hard gate |
| `PRE_EX_VENDOR_OR_SHIPMENT_DELAY` | External supply commitment is late/unknown | External dependency |
| `PRE_EX_RECEIVING_DISCREPANCY` | Quantity/part/condition/cost does not match | Parts reconciliation |
| `PRE_EX_PART_CUSTODY_CONFLICT` | Issue/install/return custody cannot reconcile | Custody hard gate |
| `PRE_EX_PROCEDURE_MISSING_OR_EXPIRED` | Effective approved procedure is absent | Safety/quality hard gate |
| `PRE_EX_TECHNICIAN_INELIGIBLE` | Skills/certifications/location are insufficient | Skill hard gate |
| `PRE_EX_RESOURCE_UNAVAILABLE_OR_CONFLICT` | Bay/tool/equipment/window is unavailable | Capacity/waiting |
| `PRE_EX_DEPENDENCY_UNRESOLVED` | Predecessor/external/safety dependency is open | Workflow gate |
| `PRE_EX_DISPATCH_CONFLICT` | Technician/resource has incompatible assignment/reservation | Schedule gate |
| `PRE_EX_PREWORK_SAFETY_FAILED` | Setup/safety condition blocks start | Safety hard gate |
| `PRE_EX_EXECUTION_BLOCKED` | Work paused with unresolved cause | Operational waiting |
| `PRE_EX_SCOPE_OR_CONDITION_CHANGED` | New finding/correction exceeds current authority | Reapproval hard gate |
| `PRE_EX_SAFETY_OR_ENVIRONMENTAL_INCIDENT` | Incident requires containment/response | Critical hard gate |
| `PRE_EX_EXECUTION_EVIDENCE_MISSING` | Required procedure/measurement/test evidence is absent | Evidence gate |
| `PRE_EX_LABOR_OR_CLOCK_CONFLICT` | Labor event/clock is invalid or conflicting | Time/audit gate |
| `PRE_EX_JOB_NOT_COMPLETE` | Authorized correction/procedure remains incomplete | Completion gate |
| `PRE_EX_QC_HANDOFF_INCOMPLETE` | Required QC context/evidence is absent | Handoff gate |
| `PRE_EX_DATA_OR_VERSION_CONFLICT` | Parts/job/dispatch/labor states conflict | Data/concurrency gate |

## 17. Scenario catalog

| Scenario ID | Scenario | Expected controlled outcome |
| --- | --- | --- |
| `PRE-SCN-001` | Normal authorized job, local parts reserved, eligible technician | Attributable execution and complete QC handoff |
| `PRE-SCN-002` | Job requires no parts | Parts gate passes only from explicit job truth, not missing demand |
| `PRE-SCN-003` | Required demand missing | Job remains unready; exact demand work created |
| `PRE-SCN-004` | Stock on hand but already allocated | No overreservation; sourcing/waiting alternatives shown |
| `PRE-SCN-005` | Stock on hand but damaged/quarantined | Unusable quantity cannot satisfy readiness |
| `PRE-SCN-006` | Partial stock available | Partial reservation visible; job remains unready unless approved phased work exists |
| `PRE-SCN-007` | Approved substitute available | Fitment/authorization/procedure impacts verified before use |
| `PRE-SCN-008` | Unapproved vendor substitute suggested | Reject as ineligible; route interchange/manager review |
| `PRE-SCN-009` | Inter-location transfer is fastest source | Controlled transfer/custody/ETA; no local availability fiction |
| `PRE-SCN-010` | Purchase exceeds parts/recon authority | Preserve request and route exact higher approval |
| `PRE-SCN-011` | Related POs split under limit | Aggregate exposure and enforce authority |
| `PRE-SCN-012` | Vendor acknowledges then delays | Retain original/revised ETA and owner; re-evaluate schedule |
| `PRE-SCN-013` | Part backordered without ETA | Create alternate/disposition/replan decision, not indefinite waiting |
| `PRE-SCN-014` | Partial receipt | Accept usable quantity, discrepancy/backorder remainder, truthful readiness |
| `PRE-SCN-015` | Wrong part received | Quarantine/return/replacement; demand remains unsatisfied |
| `PRE-SCN-016` | Damaged part received | Damaged stock/ledger and replacement path; no reservation as usable |
| `PRE-SCN-017` | Cost variance on receipt | Preserve expected/received cost and route approval/reconciliation |
| `PRE-SCN-018` | Two jobs reserve last part concurrently | Serializable/expected-version control permits one allocation |
| `PRE-SCN-019` | Reservation released after scope change | Ledger and readiness reverse correctly; history remains |
| `PRE-SCN-020` | Part issued but job reassigned | Custody transfers explicitly; no duplicate issue |
| `PRE-SCN-021` | Issued part not used | Unused return or controlled disposition reconciles custody |
| `PRE-SCN-022` | Installed part later found wrong/defective | Preserve install evidence; changed-scope/warranty/rework path |
| `PRE-SCN-023` | Core/warranty return due | Owned custody/return/credit recovery without blocking unrelated QC unless policy requires |
| `PRE-SCN-024` | Procedure missing/expired | Dispatch/start blocked until approved procedure/specialist path |
| `PRE-SCN-025` | Technician lacks certification | Server denies dispatch/start |
| `PRE-SCN-026` | Qualification expires before scheduled work | Reassign/reschedule; no grandfathering without policy |
| `PRE-SCN-027` | Required bay/tool unavailable | Job remains unready; resource resolution work created |
| `PRE-SCN-028` | Bay/technician conflicts with appointment | Conflict review; only permitted override can proceed |
| `PRE-SCN-029` | Technician already has current job/running clock | Prevent second active job/clock |
| `PRE-SCN-030` | Job staged as next | Cannot start until promoted active/current and revalidated |
| `PRE-SCN-031` | Pre-work safety check fails | Do not start; contain and route qualified response |
| `PRE-SCN-032` | Wrong vehicle/job presented to technician | Block start and reconcile identity/dispatch |
| `PRE-SCN-033` | Work proceeds normally with required evidence | Finish sets Ready for QC, not QC passed |
| `PRE-SCN-034` | Technician pauses waiting on tool/part | Safe state, custody, owner, ETA, and clock remain truthful |
| `PRE-SCN-035` | Technician resumes after blocker | All affected prerequisites revalidated before resume |
| `PRE-SCN-036` | New defect discovered during repair | Stop affected work and route diagnosis/re-estimate/reapproval |
| `PRE-SCN-037` | Additional low-cost work requested without authority | No “while you’re there” execution; exact approval required |
| `PRE-SCN-038` | Safety incident during work | Immediate containment, one correlated incident, no blame inference |
| `PRE-SCN-039` | Procedure step deviation needed | Pause and obtain approved deviation/replan; preserve evidence |
| `PRE-SCN-040` | Sublet vendor reports completion | Internal owner verifies return/custody/evidence; QC still required |
| `PRE-SCN-041` | Active job reassigned at shift change | Safe procedure/parts/tools/labor handoff and new eligible dispatch |
| `PRE-SCN-042` | Labor finish lacks evidence/QC notes | Finish rejected; draft/work preserved |
| `PRE-SCN-043` | Labor time correction requested | Append correction with authority; original event remains |
| `PRE-SCN-044` | Evidence upload fails | Preserve local/draft work; completion gate stays incomplete |
| `PRE-SCN-045` | External parts/provider system unavailable | Durable local facts, visible staleness/reconciliation, no invented status |
| `PRE-SCN-046` | Duplicate receipt/reservation/issue/labor command replay | Same result; no duplicate stock/custody/time/event |
| `PRE-SCN-047` | Concurrent dispatch/labor command | One expected-version transition; recoverable current state |
| `PRE-SCN-048` | Unauthorized user attempts issue/start/finish | Server denial and protected evidence |
| `PRE-SCN-049` | Authorization revoked during active work | Safe stop/effect classification/recovery; no deletion |
| `PRE-SCN-050` | Execution misses target | Owned escalation and revised forecast; no automatic completion or clock reset |

## 18. Catalog exit gate

This catalog is ready for code only when:

- policy owners approve the six demand/source/receipt/reservation/custody/completion distinctions;
- parts roles, vendor/source eligibility, purchasing limits, cumulative exposure, substitution, PO, receipt, discrepancy, return/core/warranty, and custody policies are approved;
- shop roles, procedure publication, qualifications, bay/tool/resource, queue, dispatch, conflict/override, labor, and evidence policies are approved;
- pre-work, EV/high-voltage, lift, environmental, incident, stop-work, and emergency boundaries are approved by qualified authority;
- changed-scope, reapproval, sublet, reassignment, cancellation, correction, and recovery behavior are approved;
- job completion and QC handoff requirements are approved without allowing technician completion to pass QC;
- staff walk through at least twenty representative cases spanning sourcing, receipt discrepancy, reservation race, custody, dispatch, safety, changed scope, labor correction, sublet, and degraded-system paths;
- acceptance scenarios map to planned automated/manual evidence;
- no workflow behavior is activated merely because this planning catalog exists.
