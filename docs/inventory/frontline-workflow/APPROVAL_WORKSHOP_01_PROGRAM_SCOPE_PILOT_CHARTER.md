# Approval Workshop 01 - Program, Scope, and Pilot Charter

**Workshop status:** Decision-ready; not conducted  
**Decision state:** All decisions remain `OPEN` until authorized sign-off  
**Covers:** `ITF-APR-001`-`006`, `010`-`015`, `070`-`075`  
**Recommended pilot:** Time Motor Sales - Minneapolis, manual manager-confirmed, narrow cohort  
**Prepared:** 2026-07-15

## 1. Workshop outcome

This workshop must produce an approved or safely deferred program charter for the first implementation slice. It does not approve code, activate workflow triggers, authorize purchases/transport, establish title law, or enable later lifecycle stages.

Required output:

- approved Inventory-to-Frontline purpose, scope, precedence, and boundaries;
- approved first code boundary from authoritative acquisition through Receipt/Custody handoff;
- one pilot organization/location/cohort and explicit exclusions;
- approved trigger modes and non-waivable gates;
- operating timezone/calendar/after-hours assumptions;
- tabletop, shadow, manual-pilot, success, pause, rollback, resume, and later automatic-start charter;
- named decision authorities and unresolved dependencies.

## 2. Decision rules

For each decision, authorized participants must choose:

- `APPROVE` - accept the exact recommendation for the stated pilot scope;
- `APPROVE_WITH_CHANGE` - record exact replacement language and impacted decisions;
- `DEFER_SAFE` - do not expose or execute the affected live action; record owner/target;
- `REJECT` - return the decision package for redesign with rationale.

Silence, meeting discussion, or this recommended packet does not change an Approval Register state. Approval requires approver, role/authority, date/time, effective scope, version, rationale, conditions, and affected decision IDs.

## 3. Repository facts versus proposed policy

| Context | Repository fact | Workshop treatment |
| --- | --- | --- |
| Organization | `Time Motor Sales`, code `TIME_MOTOR_SALES` | Recommend as sole pilot organization |
| Initial location | `Time Motor Sales - Minneapolis`, code `TMS-MSP-01` | Recommend as sole pilot location |
| Timezone | `America/Chicago` | Recommend for pilot clocks/reporting |
| Known weekday windows | Monday-Friday, 09:00-18:00 | Location record is draft; management must approve/replace |
| Location scheduling status | `DRAFT` | Cannot be treated as production-approved hours/capability |
| Rollout foundation | Planned, enabled, paused, rolled back, resumed | Reuse; start `PLANNED`/off |
| Existing retail inventory rollout | Source-controlled foundation, activation pending | Does not authorize this workflow pilot |

## 4. Recommended charter summary

| Decision | Recommended outcome | Required authority | State |
| --- | --- | --- | --- |
| `ITF-APR-001` | Approve outcome/scope/precedence in section 5 | GM/Operations | OPEN |
| `ITF-APR-002` | Approve nine-stage lifecycle and first code boundary ending at accepted Receipt/Custody handoff | Workflow + policy owners | OPEN |
| `ITF-APR-003` | Approve manager-confirmed/manual and shadow triggers only; automatic starts disabled | Inventory Manager | OPEN |
| `ITF-APR-004` | Approve catalog questions/options/terminology for tabletop use, subject to logged revisions | Inventory Manager + pilot staff | OPEN |
| `ITF-APR-005` | Approve non-waivable pilot hard gates in section 6 | GM/Operations policy owner | OPEN |
| `ITF-APR-006` | Approve separate cancellation, acquisition reversal, transport recovery, and disposition commands | GM/Operations | OPEN |
| `ITF-APR-010` | Time Motor Sales / Minneapolis only | GM/Operations | OPEN |
| `ITF-APR-011` | Narrow source/acquisition cohort in section 7 | Inventory Manager | OPEN |
| `ITF-APR-012` | Standard passenger/light-duty cohort with explicit exclusions | Inventory + Shop/Safety | OPEN |
| `ITF-APR-013` | Minneapolis destination/receiving boundaries in section 8 | Location/Operations owner | OPEN |
| `ITF-APR-014` | No-movement, approved carrier/tow, and seller delivery; internal drive deferred | Inventory + Safety/Insurance | OPEN |
| `ITF-APR-015` | America/Chicago; approved operating calendar; after-hours containment only | Operations owner | OPEN |
| `ITF-APR-070` | Approve cross-functional participants and 12 minimum tabletop cases | Pilot owner | OPEN |
| `ITF-APR-071` | Approve proposed shadow thresholds as hypotheses requiring measured evidence | Pilot + policy owners | OPEN |
| `ITF-APR-072` | One location, trained cohort, 20 vehicles/30 days minimum, manager-confirmed starts | GM/Operations + pilot owner | OPEN |
| `ITF-APR-073` | Approve zero-critical-failure and reliability/usability success thresholds | GM/Operations + pilot owner | OPEN |
| `ITF-APR-074` | Name monitoring, incident, pause, rollback, and resume authorities | GM/Operations | OPEN |
| `ITF-APR-075` | Keep automatic starts disabled until shadow/manual exits and separate authorization | GM/Operations + Inventory | OPEN |

## 5. Proposed program charter (`ITF-APR-001`, `002`)

### Outcome

Move each dealership-controlled retail inventory unit from an authoritative acquisition to verified, revocable frontline readiness while protecting, in order:

1. people, safety, law, privacy, identity, and custody;
2. valid authority, evidence integrity, and truthful customer/public information;
3. customer and dealership commitments;
4. capital, margin, time-to-frontline, and operational capacity;
5. explainability, accountability, resilience, and continuous improvement.

### Included lifecycle

```text
Acquisition/Transportation
-> Receipt/Custody
-> Inspection/Triage
-> Recon Planning/Approval
-> Parts/Repair Execution
-> Quality/Safety Verification
-> Title/Document Readiness
-> Merchandising/Pricing
-> Frontline Release Review
-> FRONTLINE_READY with early verification/suspension recovery
```

Controlled parallel preparation is allowed only under an approved policy that names permitted/prohibited actions and preserves all final gates.

### Excluded authority

The program does not autonomously:

- acquire, purchase, approve spend, select customer price, publish public content, or dispose of a vehicle;
- determine legal ownership/title sufficiency, waive law/safety, or replace counsel/compliance;
- reserve, sell, contract, fund, invoice, collect payment, deliver, or post accounting/DMS entries;
- discipline employees or infer fault from operational evidence;
- treat scores, elapsed time, customer interest, AI/provider output, or management preference as a critical-gate pass.

### First implementation boundary

The first code slice begins from an authoritative confirmed acquisition eligible for the approved pilot and ends only when:

- transportation/no-movement has an attributable outcome;
- arrival is presented to Receipt/Custody with identity, source, location, movement, condition, receiver, expected keys/documents/accessories, restrictions, evidence, clocks, and owner;
- Receipt/Custody explicitly accepts or rejects the handoff.

The first slice does not complete Receipt/Custody or activate later workflow stages.

## 6. Proposed hard gates (`ITF-APR-005`)

The following are non-waivable in the pilot:

- organization and pilot-location eligibility;
- one canonical vehicle/inventory cycle and approved temporary-identity authority;
- authoritative acquisition and valid acquisition authority;
- current physical location and custody responsibility;
- movement method eligibility and safe/legal operation evidence;
- driver, insurance, carrier/provider, destination, and release eligibility where applicable;
- exact financial authority before commitment;
- mandatory pickup/departure/arrival and handoff evidence;
- protected evidence access and no unresolved critical conflict;
- idempotency, expected version, capability, audit, event, and rollout enforcement.

General manager authority cannot bypass identity, law, safety, privacy, custody integrity, or mandatory evidence. Emergency action may contain immediate harm but cannot retroactively change the authority state.

## 7. Proposed pilot cohort (`ITF-APR-010`-`012`)

### Included

- Organization: Time Motor Sales.
- Location: Time Motor Sales - Minneapolis (`TMS-MSP-01`).
- Intended route: dealership-controlled retail inventory only.
- Acquisition/source cases for tabletop/shadow:
  - consumer trade-in already onsite;
  - known dealer/seller purchase;
  - approved auction purchase requiring carrier/tow;
  - verified no-transport unit already at the intended location.
- Live manual pilot begins with:
  - trade-ins already onsite; and
  - known dealer/seller or auction purchases using an approved carrier/tow or seller delivery.
- Vehicles: standard passenger vehicles and light-duty trucks with canonical VIN, ordinary size/weight, and handling supported by approved pilot resources.

### Excluded until separately approved

- wholesale-only or immediate-disposition units;
- consignment, import, repossession/recovery, donation, estate/trust/entity-special process;
- missing/nonstandard VIN except tabletop/shadow temporary-identity scenario;
- salvage/rebuilt/flood or materially ambiguous title/history;
- motorcycles, powersports, heavy/commercial, oversized, specialty, exotic, or hazardous-load vehicles;
- EV/high-voltage movement requiring policy not yet approved;
- internal driving/pickup;
- multi-location transfers or non-Minneapolis destinations;
- autonomous trigger, purchase, dispatch, provider commitment, or receipt completion.

Exclusion does not mean the vehicle may be ignored. It routes to an existing manual process with visible ownership and is not counted as a successful pilot workflow case.

## 8. Proposed location, hours, and transport boundary (`ITF-APR-013`-`015`)

### Destination and receiving

- Intended destination: Time Motor Sales - Minneapolis only.
- Exact receiving/secure-containment locations: `TBD` by Operations before live pilot.
- Receiving capability checklist: named receiver, VIN observation, secure key/document storage, condition evidence, safe placement, and escalation contact.
- Temporary/quarantine/after-hours spaces: `TBD`; no live arrival is routed there until approved.

### Operating time

- Timezone: `America/Chicago`.
- Recommended standard pilot window: Monday-Friday, 09:00-18:00 local.
- Approved holidays, closures, special hours, and receiver coverage must come from the location calendar.
- The current repository location status is `DRAFT`; management must explicitly approve operating windows.

### Transport methods

- verified no-movement/already onsite;
- approved carrier;
- approved tow/trailer provider;
- seller/auction delivery with internal monitor;
- internal driving/pickup: `DEFER_SAFE` until roadworthiness, driver, insurance, plate/permit, route, and incident authority are approved.

### After-hours behavior

- Do not automatically complete delivery/receipt based on a timestamp or provider claim.
- If physical arrival occurs, protect people/property, record observed custody reality, use only an approved secure containment location, notify the on-call authority, and defer formal receipt acceptance to eligible coverage.
- If no approved receiver/containment exists, the planned movement must not target after-hours arrival; recovery remains owned by the transport coordinator.

## 9. Proposed trigger charter (`ITF-APR-003`, `075`)

| Phase | Trigger mode | Allowed effect |
| --- | --- | --- |
| Tabletop | Synthetic/manual facilitator | No operational records or external actions |
| Simulation | Seeded non-production | Test durable commands with no external side effects |
| Shadow | Observe authoritative events | Compare proposed start/questions/owners; create no live staff work |
| Manual pilot | Manager-confirmed start | Create approved pilot work only after manager confirms exact case |
| Controlled automatic | Disabled in Workshop 1 | Requires separate approval after shadow/manual exit |

Automatic start should later be considered only for a stable authoritative acquisition event containing organization, canonical vehicle/inventory identity, acquisition/source authority, retail intent, location context, occurrence time, source reference, idempotency key, and sufficient confidence. Ambiguous, missing, duplicate, conflicting, out-of-scope, or manually backfilled events remain manager-confirmed.

## 10. Proposed cancellation and route boundaries (`ITF-APR-006`)

Treat these as separate attributable commands:

- cancel a transport request/plan;
- amend movement method/destination/time/provider;
- stop or recover movement already in progress;
- reverse/cancel the acquisition under separate business authority;
- change retail intent to wholesale/disposition;
- return/reject the vehicle under approved custody/legal authority.

Each command records actor, authority, reason, effective time, committed/incurred/disputed costs, custody/location, evidence, downstream work, notifications, and recovery owner. No cancellation deletes accepted acquisition, custody, financial, event, or evidence history.

## 11. Proposed tabletop cases (`ITF-APR-070`)

At minimum, walk through:

1. trade-in already onsite with complete identity/source;
2. auction purchase with approved carrier;
3. seller delivery with an internal monitor;
4. internal drive requested but roadworthiness unknown;
5. cost above requester authority;
6. release document missing;
7. missed pickup/revised ETA;
8. delivery with apparent new damage;
9. wrong-location delivery;
10. duplicate acquisition event and concurrent decision;
11. cancellation before pickup and reversal in transit;
12. temporary non-VIN identity and disputed delivery.

Required participants:

- General/Operations Manager or delegated policy authority;
- Inventory Manager and proposed workflow/service owner;
- transport coordinator/operator and receiving/lot representative;
- Office/Controller delegate for authority/evidence boundaries;
- Shop/Safety or insurance-qualified advisor for movement exclusions;
- pilot owner and implementation owner;
- at least one representative staff executor who did not author the catalog.

## 12. Proposed shadow thresholds (`ITF-APR-071`)

These are recommended starting hypotheses, not claims about current performance:

| Measure | Proposed threshold | Hard/diagnostic treatment |
| --- | ---: | --- |
| Eligible trigger precision | At least 98% | Required for automatic-start consideration |
| Eligible trigger recall | At least 95% | Diagnostic; misses reviewed individually |
| Duplicate workflow/unit creation | 0 | Hard gate |
| Out-of-scope live work creation | 0 | Hard gate |
| Mandatory input completeness before command eligibility | 100% | Hard gate |
| Critical-gate false pass | 0 | Hard gate |
| Correct proposed owner/route | At least 95% | Required for automatic-start consideration |
| Manager agreement with presented options/next action | At least 85% | Usability/calibration threshold |
| Unexplained provider/source state | 0 labeled as confirmed | Hard truthfulness gate |

Threshold calculations require denominator, cohort, exclusions, confidence interval or sample limitation, reviewer, and evidence. Small samples cannot justify broad automatic rollout.

## 13. Proposed manual pilot (`ITF-APR-072`)

- One organization and one location.
- Named trained users only; least privilege.
- Manager confirms every start and every consequential external action.
- Minimum 20 completed/terminal pilot cases and 30 calendar days, whichever occurs later.
- Maximum five concurrently active pilot cases until the first ten close without critical control failure.
- Daily manager review during active weekdays; weekly cross-functional review.
- No automatic purchase, transport commitment, external provider mutation, receipt completion, or later-stage activation.
- Existing safe manual process remains available during pause/rollback.

If the approved cohort cannot produce 20 cases in a reasonable window, the pilot owner must propose a new evidence-based volume/duration; the system must not silently lower the gate.

## 14. Proposed pilot success criteria (`ITF-APR-073`)

### Release-blocking

- zero critical safety, identity, custody, privacy, permission, financial-authority, or evidence-integrity failure;
- zero duplicate inventory units/workflows/consequential commands;
- 100% successful reconstruction of sampled command, decision, evidence, owner, clock, exception, event, and handoff history;
- 100% critical commands server-enforced for capability, scope, idempotency, and expected version;
- no unresolved high-severity defect or incident at exit.

### Operating quality

- at least 95% of open work/dependencies/exceptions have the correct named owner and next target;
- at least 95% of completed handoffs contain the required envelope without manual forensic repair;
- at least 90% of pilot users complete common paths without facilitator correction after training;
- median staff usefulness rating at least 4 of 5 for questions, options, next action, and blocker visibility;
- no material regression in acquisition-to-receipt time after segmenting external waits and cohort differences;
- every alert/escalation has a documented actionable recipient and no repeated unactionable critical alert pattern.

Outcome improvement is directional during the initial small pilot and cannot compensate for a failed control gate.

## 15. Proposed monitoring, pause, rollback, and resume (`ITF-APR-074`)

### Roles to name in the workshop

| Responsibility | Named person | Required authority |
| --- | --- | --- |
| Pilot business owner | `TBD` | Approve cohort/start and daily operation |
| Workflow/service owner | `TBD` | Own work health, defects, and staff support |
| Incident lead | `TBD` | Coordinate safety/security/data/operational incident |
| Pause authority | `TBD` | GM/Operations or delegated pilot authority |
| Rollback authority | `TBD` | GM/Operations |
| Technical rollback executor | `TBD` | Authorized implementation/operations owner |
| Resume approver | `TBD` | Pause authority plus resolved release gates |

### Immediate pause triggers

- any critical false pass or unauthorized consequential command;
- identity/custody history corruption or duplicate inventory cycle;
- safety/privacy/security incident attributable to pilot behavior;
- lost accepted command/evidence/event or unreconstructable material decision;
- broad provider/projection inconsistency that could misstate vehicle status;
- role/permission failure exposing cross-location or restricted evidence;
- staff cannot safely use the fallback/manual process.

### Rollback and resume

- Pause stops new starts/commands in the affected scope without deleting records.
- Rollback disables the pilot feature scope, preserves evidence, reconciles in-flight work, assigns manual owners, and confirms downstream effects.
- Resume is allowed only from paused state after root cause, correction, regression/acceptance evidence, reconciliation, staff communication/training, and explicit authority sign-off.

## 16. Decision capture sheet

| Decision ID | Choice | Exact approved/replacement text or safe deferral | Approver/role | Effective scope/date | Conditions/owner/target |
| --- | --- | --- | --- | --- | --- |
| `ITF-APR-001` | `TBD` |  |  |  |  |
| `ITF-APR-002` | `TBD` |  |  |  |  |
| `ITF-APR-003` | `TBD` |  |  |  |  |
| `ITF-APR-004` | `TBD` |  |  |  |  |
| `ITF-APR-005` | `TBD` |  |  |  |  |
| `ITF-APR-006` | `TBD` |  |  |  |  |
| `ITF-APR-010` | `TBD` |  |  |  |  |
| `ITF-APR-011` | `TBD` |  |  |  |  |
| `ITF-APR-012` | `TBD` |  |  |  |  |
| `ITF-APR-013` | `TBD` |  |  |  |  |
| `ITF-APR-014` | `TBD` |  |  |  |  |
| `ITF-APR-015` | `TBD` |  |  |  |  |
| `ITF-APR-070` | `TBD` |  |  |  |  |
| `ITF-APR-071` | `TBD` |  |  |  |  |
| `ITF-APR-072` | `TBD` |  |  |  |  |
| `ITF-APR-073` | `TBD` |  |  |  |  |
| `ITF-APR-074` | `TBD` |  |  |  |  |
| `ITF-APR-075` | `TBD` |  |  |  |  |

## 17. Workshop agenda

Recommended duration: 120 minutes plus follow-up for unresolved policy.

1. Confirm authority, purpose, and decision rules - 10 minutes.
2. Approve/change program charter and first code boundary - 20 minutes.
3. Approve/change pilot location, acquisition, vehicle, destination, hours, and transport cohort - 25 minutes.
4. Approve/change triggers, hard gates, cancellation, and excluded authority - 20 minutes.
5. Approve/change tabletop, shadow, manual pilot, and success thresholds - 25 minutes.
6. Name pilot/pause/rollback/resume authorities - 10 minutes.
7. Read back all decisions, dependencies, owners, targets, and next workshop gate - 10 minutes.

## 18. Workshop exit gate

Workshop 1 is complete only when:

- all 18 decisions have an authorized state and exact scope;
- no critical scope, location, cohort, trigger, hard-gate, or pilot authority ambiguity remains;
- every deferral has safe prevention behavior, owner, and target;
- participant names and sign-offs are recorded;
- Approval Register entries are updated with evidence/reference to this packet;
- Workshop 2 receives the approved scope and unresolved role/evidence/security/timing/financial/integration dependencies.

Until then, the result remains `WORKSHOP PACKET READY`, not `WORKSHOP APPROVED`.
