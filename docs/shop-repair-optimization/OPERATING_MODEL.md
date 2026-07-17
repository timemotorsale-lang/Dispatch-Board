# Shop Optimization Operating Model

**Status:** Proposed operating contract; not activated

## 1. End-to-end lifecycle

```text
Appointment / walk-in / inventory-recon request
-> Intake and concern normalization
-> Inspection / diagnosis
-> Estimate and authorization
-> Parts, procedure, skill, bay and tool readiness
-> Dispatch and repair execution
-> Changed-scope loop when necessary
-> QC / safety verification / road test when required
-> Advisor or inventory handoff
-> Customer delivery or inventory lifecycle return
-> Close, follow-up, comeback monitoring and learning
```

Customer-pay and inventory-recon work share repair execution controls but retain different authorizers, commitments, economics, communications, and terminal handoffs.

## 2. Standard work states

| State | Meaning | Exit evidence |
| --- | --- | --- |
| `INTAKE_PENDING` | Request exists; identity/concern/ownership incomplete | Valid intake classification |
| `DIAGNOSIS_REQUIRED` | Cause/scope is not sufficiently known | Confirmed finding or controlled next diagnostic step |
| `AWAITING_ESTIMATE` | Findings exist; presentation package incomplete | Versioned estimate |
| `AWAITING_AUTHORIZATION` | Exact scope awaits the correct authority | Accepted/partial/declined/deferred decision |
| `WAITING_PARTS` | Authorized work lacks usable reserved parts | Reconciled availability/reservation |
| `WAITING_RESOURCE` | Skill, bay, tool, equipment, procedure, or capacity unavailable | Eligible resource window |
| `READY_FOR_DISPATCH` | Every job-start prerequisite is currently satisfied | Versioned dispatch |
| `STAGED_NEXT` | Ready job reserved as a technician's next work | Promotion/revalidation |
| `IN_REPAIR` | Authorized work actively executing | Pause, changed scope, or finish |
| `PAUSED` | Work safely stopped with owned blocker | Revalidated resume or replanning |
| `CHANGED_SCOPE` | New condition exceeds current authority | New decision/authorization |
| `READY_FOR_QC` | Technician execution complete; release not approved | QC disposition |
| `QC_REWORK` | Verification failed and exact rework is owned | Repaired and resubmitted |
| `READY_FOR_HANDOFF` | Operational release passed for the applicable lane | Advisor/inventory acceptance |
| `CLOSED` | Administrative, financial, evidence and delivery closure complete | Reopen only by controlled command |

## 3. Job-start readiness gate

A job is ready only when all applicable conditions pass:

- correct vehicle, RO, job, ownership lane, and location;
- current authorization and financial scope;
- approved procedure and safety prerequisites;
- eligible technician skills/certifications;
- required bay, lift, tool, equipment, and time window;
- usable parts reserved and physically locatable, or an explicit no-parts job;
- predecessor work complete and no incompatible active booking;
- customer/inventory promise and vehicle-access constraints understood;
- evidence template and QC/road-test requirements known;
- no unresolved safety, identity, custody, data, or version conflict.

The result states `READY`, `READY_WITH_MANAGER_REVIEW`, or `NOT_READY` with exact reason codes and resolution actions.

## 4. Queue model

| Queue | Entry rule | Default owner |
| --- | --- | --- |
| Safety/critical | Immediate safety, security, environmental, or legal containment | Manager/qualified authority |
| Customer waiting | Customer remains onsite and work is eligible | Advisor + dispatcher |
| Promise recovery | Promised time at material risk | Manager + dispatcher |
| Inventory frontline risk | Frontline target threatened and work is eligible | Inventory + dispatcher |
| Ready dispatch | All prerequisites satisfied | Dispatcher |
| Diagnosis | Diagnostic skill/procedure required | Foreman/dispatcher |
| Parts/approval wait | Work cannot start; exact dependency owned | Parts/advisor |
| QC/rework | Repair execution complete or failed verification | QC/foreman |
| Planned/future | Valid work not yet available | Scheduling owner |

Queue membership never overrides eligibility. A high-priority unready job receives blocker-resolution work, not an invalid bay or technician assignment.

## 5. Staff decision pattern

Every decision card asks one concrete question, shows authoritative context, and presents valid options. Example:

**Is this job ready to start?**

- `Start assigned work` — all hard gates pass.
- `Stage as next` — ready, but the technician is completing current work.
- `Resolve missing part` — identify source, substitute review, transfer, ETA follow-up, or replan.
- `Resolve authorization` — present estimate/change order to correct authority.
- `Select another eligible technician/resource` — compare valid candidates.
- `Pause and contain` — safety, changed condition, or incident.
- `Request manager review` — policy conflict or consequential override.

Every choice previews effects on promised time, queue position, parts/resource reservations, customer update needs, and downstream work.

## 6. Interruption policy

An active job may be interrupted only for an approved reason such as safety containment, missing/failed part, changed scope, higher-order customer or legal commitment, resource failure, or manager-authorized recovery. The pause captures safe condition, labor clock, parts/tool custody, bay effect, blocker owner, next review, and whether revalidation is required.

## 7. QC and release

Technician completion creates `READY_FOR_QC`; it never passes QC. Required verification depends on repair type and risk. Failed items create exact rework linked to the original job and verification evidence. Road tests require approved driver, insurance/policy eligibility, route or conditions, pre/post mileage, observed results, and incident recovery. Customer delivery, inventory handoff, and frontline release remain separate commands.

## 8. Degraded operation

If a source or recommendation service fails, staff retain access to durable authoritative facts, current ownership, safe manual procedures, and visible freshness. The system must not invent parts availability, technician eligibility, customer consent, price, authorization, or completion. Manual actions reconcile later through idempotent commands and explicit conflict review.
